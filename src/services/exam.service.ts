import { supabase, PUBLIC_APP_URL } from "@/lib/supabase";
import type { ExamDocument, ExamListItem, ExamQuestion } from "@/types";
import { writeAuditLog } from "@/services/audit.service";

function slugify(text: string): string {
  return text
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

function randomCode(length = 6): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

function mapExam(row: any): ExamDocument {
  return {
    id: row.id,
    categoryId: row.category_id,
    title: row.title,
    instructions: row.instructions,
    publicCode: row.public_code ?? "",
    publicSlug: row.public_slug ?? "",
    publicUrl: row.public_url ?? "",
    questionCount: row.question_count,
    totalPoints: row.total_points,
    passingScore: row.passing_score,
    availabilityStatus: row.availability_status,
    hasTimeLimit: row.has_time_limit,
    durationMinutes: row.duration_minutes,
    openingDate: row.opening_date ?? undefined,
    closingDate: row.closing_date ?? undefined,
    timezone: row.timezone,
    maximumAttempts: row.maximum_attempts,
    closeExamBehavior: row.close_exam_behavior,
    closedAt: row.closed_at ?? undefined,
    closedBy: row.closed_by ?? undefined,
    closingReason: row.closing_reason ?? undefined,
    publishedAt: row.published_at ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapQuestion(row: any): ExamQuestion {
  return {
    id: row.id,
    order: row.order,
    type: row.question_type ?? "multiple_choice",
    questionText: row.question_text,
    options: row.options,
    correctOptionId: row.correct_option_id,
    correctAnswerText: row.correct_answer_text ?? "",
    points: row.points,
    explanation: row.explanation ?? undefined,
    isRequired: row.is_required,
  };
}

/** Every published examination across all categories, newest first. */
export function subscribeToAllExams(callback: (exams: ExamListItem[]) => void) {
  async function load() {
    const { data } = await supabase
      .from("exams")
      .select("*, categories(name, position_title)")
      .not("public_code", "is", null)
      .order("published_at", { ascending: false });
    callback(
      (data ?? []).map((row: any) => ({
        ...mapExam(row),
        categoryName: row.categories?.name ?? "",
        positionTitle: row.categories?.position_title ?? "",
      }))
    );
  }
  load();

  const channel = supabase
    .channel("all-exams")
    .on("postgres_changes", { event: "*", schema: "public", table: "exams" }, load)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToExam(examId: string, callback: (exam: ExamDocument | null) => void) {
  async function load() {
    const { data } = await supabase.from("exams").select("*").eq("id", examId).maybeSingle();
    callback(data ? mapExam(data) : null);
  }
  load();

  const channel = supabase
    .channel(`exam-${examId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "exams", filter: `id=eq.${examId}` }, load)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToQuestions(examId: string, callback: (questions: ExamQuestion[]) => void) {
  async function load() {
    const { data } = await supabase
      .from("exam_questions")
      .select("*")
      .eq("exam_id", examId)
      .order("order", { ascending: true });
    callback((data ?? []).map(mapQuestion));
  }
  load();

  const channel = supabase
    .channel(`exam-questions-${examId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "exam_questions", filter: `exam_id=eq.${examId}` },
      load
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

function toQuestionRow(examId: string, question: ExamQuestion) {
  return {
    id: question.id,
    exam_id: examId,
    order: question.order,
    question_type: question.type,
    question_text: question.questionText,
    options: question.options,
    correct_option_id: question.correctOptionId,
    correct_answer_text: question.correctAnswerText,
    points: question.points,
    explanation: question.explanation ?? null,
    is_required: question.isRequired,
  };
}

export async function saveQuestion(examId: string, question: ExamQuestion) {
  const { error } = await supabase.from("exam_questions").upsert(toQuestionRow(examId, question));
  if (error) throw error;
}

export async function updateExamTitle(examId: string, title: string) {
  const { error } = await supabase.from("exams").update({ title }).eq("id", examId);
  if (error) throw error;
}

export async function deleteQuestion(questionId: string) {
  const { error } = await supabase.from("exam_questions").delete().eq("id", questionId);
  if (error) throw error;
}

/** Replaces every question on the exam with a freshly generated set, in one delete + one insert. */
export async function regenerateQuestions(examId: string, questions: ExamQuestion[]): Promise<ExamQuestion[]> {
  const { error: deleteError } = await supabase.from("exam_questions").delete().eq("exam_id", examId);
  if (deleteError) throw deleteError;

  if (questions.length === 0) return [];

  const { data, error: insertError } = await supabase
    .from("exam_questions")
    .insert(questions.map((question) => toQuestionRow(examId, question)))
    .select("*")
    .order("order", { ascending: true });
  if (insertError) throw insertError;

  return (data ?? []).map(mapQuestion);
}

/** Inserts an additional batch of questions onto the exam, leaving existing questions untouched. */
export async function appendQuestions(examId: string, questions: ExamQuestion[]): Promise<ExamQuestion[]> {
  if (questions.length === 0) return [];

  const { data, error } = await supabase
    .from("exam_questions")
    .insert(questions.map((question) => toQuestionRow(examId, question)))
    .select("*")
    .order("order", { ascending: true });
  if (error) throw error;

  return (data ?? []).map(mapQuestion);
}

/** Gets the category's single exam row, creating a draft if one doesn't exist yet. */
export async function ensureExamDraft(categoryId: string, categoryName: string, userId: string): Promise<string> {
  const { data: existing } = await supabase
    .from("exams")
    .select("id")
    .eq("category_id", categoryId)
    .maybeSingle();
  if (existing) return existing.id as string;

  const { data, error } = await supabase
    .from("exams")
    .insert({
      category_id: categoryId,
      title: `${categoryName} Examination`,
      instructions:
        "Read each question carefully and select the best answer. You may not go back once you submit.",
      passing_score: 70,
      availability_status: "draft",
      has_time_limit: true,
      duration_minutes: 30,
      timezone: "Asia/Manila",
      maximum_attempts: 1,
      close_exam_behavior: "allow_active_attempts_to_finish",
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

export async function publishExam(
  categoryId: string,
  examId: string,
  categoryName: string,
  questions: ExamQuestion[],
  userId: string,
  userName: string
) {
  const publicCode = `${slugify(categoryName)}-${randomCode()}`;
  const publicUrl = `${PUBLIC_APP_URL}/exam/${publicCode}`;
  const totalPoints = questions.reduce((sum, q) => sum + q.points, 0);

  const { error } = await supabase
    .from("exams")
    .update({
      public_code: publicCode,
      public_slug: publicCode,
      public_url: publicUrl,
      question_count: questions.length,
      total_points: totalPoints,
      availability_status: "open",
      published_at: new Date().toISOString(),
    })
    .eq("id", examId);
  if (error) throw error;

  await writeAuditLog({
    userId,
    userName,
    action: "exam_published",
    entityType: "exam",
    entityId: examId,
    description: `Published examination with public link ${publicUrl}`,
    categoryId,
    examId,
  });

  return { publicCode, publicUrl };
}

export async function closeExam(
  categoryId: string,
  examId: string,
  reason: string | undefined,
  userId: string,
  userName: string
) {
  const { error } = await supabase
    .from("exams")
    .update({
      availability_status: "closed",
      closed_at: new Date().toISOString(),
      closed_by: userId,
      closing_reason: reason ?? "",
    })
    .eq("id", examId);
  if (error) throw error;

  await writeAuditLog({
    userId,
    userName,
    action: "exam_closed",
    entityType: "exam",
    entityId: examId,
    description: reason ? `Closed examination: ${reason}` : "Closed examination",
    categoryId,
    examId,
  });
}

export async function reopenExam(
  categoryId: string,
  examId: string,
  userId: string,
  userName: string,
  schedule?: { openingDate?: Date; closingDate?: Date; durationMinutes?: number }
) {
  const { error } = await supabase
    .from("exams")
    .update({
      availability_status: "open",
      closed_at: null,
      closed_by: null,
      closing_reason: "",
      ...(schedule?.openingDate && { opening_date: schedule.openingDate.toISOString() }),
      ...(schedule?.closingDate && { closing_date: schedule.closingDate.toISOString() }),
      ...(schedule?.durationMinutes && { duration_minutes: schedule.durationMinutes }),
    })
    .eq("id", examId);
  if (error) throw error;

  await writeAuditLog({
    userId,
    userName,
    action: "exam_reopened",
    entityType: "exam",
    entityId: examId,
    description: "Reopened examination",
    categoryId,
    examId,
  });
}
