import { supabase, PUBLIC_APP_URL } from "@/lib/supabase";
import type { ExamDocument, ExamListItem, ExamQuestion, QuestionType } from "@/types";
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
    positionTitle: row.position_title,
    department: row.department,
    instructions: row.instructions,
    publicCode: row.public_code ?? "",
    publicSlug: row.public_slug ?? "",
    publicUrl: row.public_url ?? "",
    questionCount: row.question_count,
    totalPoints: row.total_points,
    customDirections: row.custom_directions ?? {},
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
      .select("*, categories(name)")
      .not("public_code", "is", null)
      .order("published_at", { ascending: false });
    const exams = data ?? [];

    const examIds = exams.map((row: any) => row.id);
    const applicantCountByExamId = new Map<string, number>();
    if (examIds.length > 0) {
      const { data: attempts } = await supabase.from("exam_attempts").select("exam_id").in("exam_id", examIds);
      (attempts ?? []).forEach((a: any) => {
        applicantCountByExamId.set(a.exam_id, (applicantCountByExamId.get(a.exam_id) ?? 0) + 1);
      });
    }

    callback(
      exams.map((row: any) => ({
        ...mapExam(row),
        categoryName: row.categories?.name ?? "",
        applicantCount: applicantCountByExamId.get(row.id) ?? 0,
      }))
    );
  }
  load();

  const channel = supabase
    .channel("all-exams")
    .on("postgres_changes", { event: "*", schema: "public", table: "exams" }, load)
    .on("postgres_changes", { event: "*", schema: "public", table: "exam_attempts" }, load)
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
  let current: ExamQuestion[] = [];

  function emit() {
    callback([...current].sort((a, b) => a.order - b.order));
  }

  async function load() {
    const { data } = await supabase
      .from("exam_questions")
      .select("*")
      .eq("exam_id", examId)
      .order("order", { ascending: true });
    current = (data ?? []).map(mapQuestion);
    emit();
  }
  load();

  // Merge each change directly from its realtime payload rather than re-querying the whole
  // table: a payload only fires after that row's write has committed, so it's always fresh for
  // that row. A full re-SELECT on every event would risk racing an in-flight save on a
  // *different* question (still mid-debounce or mid-write) and overwriting it with stale data —
  // which is exactly what made "Question N is missing question text" fire on publish even after
  // the text had been typed in.
  const channel = supabase
    .channel(`exam-questions-${examId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "exam_questions", filter: `exam_id=eq.${examId}` },
      (payload) => {
        if (payload.eventType === "DELETE") {
          const deletedId = (payload.old as { id?: string }).id;
          current = current.filter((q) => q.id !== deletedId);
        } else {
          const updated = mapQuestion(payload.new);
          const idx = current.findIndex((q) => q.id === updated.id);
          if (idx >= 0) current = current.map((q, i) => (i === idx ? updated : q));
          else current = [...current, updated];
        }
        emit();
      }
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

/** Recomputes exams.question_count/total_points from the live exam_questions rows, so
 * the stored summary never goes stale after a published exam is edited. */
export async function syncExamQuestionStats(examId: string) {
  const { data, error } = await supabase.from("exam_questions").select("points").eq("exam_id", examId);
  if (error) throw error;

  const rows = data ?? [];
  const { error: updateError } = await supabase
    .from("exams")
    .update({
      question_count: rows.length,
      total_points: rows.reduce((sum, row) => sum + (row.points ?? 0), 0),
    })
    .eq("id", examId);
  if (updateError) throw updateError;
}

export async function saveQuestion(examId: string, question: ExamQuestion) {
  const { error } = await supabase.from("exam_questions").upsert(toQuestionRow(examId, question));
  if (error) throw error;
  await syncExamQuestionStats(examId);
}

export async function updateExamTitle(examId: string, title: string) {
  const { error } = await supabase.from("exams").update({ title }).eq("id", examId);
  if (error) throw error;
}

/** Sets a custom DIRECTIONS override for a question-type part, or clears it (reverting
 *  to the built-in default) when `text` is null. */
export async function updateExamPartDirections(examId: string, questionType: QuestionType, text: string | null) {
  const { data: current, error: readError } = await supabase
    .from("exams")
    .select("custom_directions")
    .eq("id", examId)
    .single();
  if (readError) throw readError;

  const next = { ...(current?.custom_directions ?? {}) };
  if (text === null) {
    delete next[questionType];
  } else {
    next[questionType] = text;
  }

  const { error } = await supabase.from("exams").update({ custom_directions: next }).eq("id", examId);
  if (error) throw error;
}

export async function updateExamTimeLimit(examId: string, hasTimeLimit: boolean, durationMinutes: number | null) {
  const { error } = await supabase
    .from("exams")
    .update({ has_time_limit: hasTimeLimit, duration_minutes: hasTimeLimit ? durationMinutes : null })
    .eq("id", examId);
  if (error) throw error;
}

export async function deleteQuestion(examId: string, questionId: string) {
  const { error } = await supabase.from("exam_questions").delete().eq("id", questionId);
  if (error) throw error;
  await syncExamQuestionStats(examId);
}

/** Replaces every question on the exam with a freshly generated set, in one delete + one insert. */
export async function regenerateQuestions(examId: string, questions: ExamQuestion[]): Promise<ExamQuestion[]> {
  const { error: deleteError } = await supabase.from("exam_questions").delete().eq("exam_id", examId);
  if (deleteError) throw deleteError;

  if (questions.length === 0) {
    await syncExamQuestionStats(examId);
    return [];
  }

  const { data, error: insertError } = await supabase
    .from("exam_questions")
    .insert(questions.map((question) => toQuestionRow(examId, question)))
    .select("*")
    .order("order", { ascending: true });
  if (insertError) throw insertError;

  await syncExamQuestionStats(examId);
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

  await syncExamQuestionStats(examId);
  return (data ?? []).map(mapQuestion);
}

/** All exam sets belonging to a category, oldest first (Set 1, Set 2, ...). */
export function subscribeToExamSets(categoryId: string, callback: (exams: ExamDocument[]) => void) {
  async function load() {
    const { data } = await supabase
      .from("exams")
      .select("*")
      .eq("category_id", categoryId)
      .order("created_at", { ascending: true });
    callback((data ?? []).map(mapExam));
  }
  load();

  const channel = supabase
    .channel(`exam-sets-${categoryId}`)
    .on("postgres_changes", { event: "*", schema: "public", table: "exams", filter: `category_id=eq.${categoryId}` }, load)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/** Creates a new draft exam set for the category — a category may hold multiple sets, each for
 *  a different role, so title/position/department/passing score/duration/max attempts are all
 *  set per exam set rather than inherited from the category. */
export async function createExamSet(
  categoryId: string,
  userId: string,
  settings: {
    title: string;
    positionTitle: string;
    department: string;
    passingScore: number;
    durationMinutes: number;
    maximumAttempts: number;
  }
): Promise<string> {
  const { data, error } = await supabase
    .from("exams")
    .insert({
      category_id: categoryId,
      title: settings.title,
      position_title: settings.positionTitle,
      department: settings.department,
      instructions:
        "Read each question carefully and select the best answer. You may not go back once you submit.",
      passing_score: settings.passingScore,
      availability_status: "draft",
      has_time_limit: true,
      duration_minutes: settings.durationMinutes,
      timezone: "Asia/Manila",
      maximum_attempts: settings.maximumAttempts,
      close_exam_behavior: "allow_active_attempts_to_finish",
      created_by: userId,
    })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

/** Updates an exam set's title/position/department/passing score/max attempts. */
export async function updateExamSettings(
  examId: string,
  settings: Partial<{
    title: string;
    positionTitle: string;
    department: string;
    passingScore: number;
    maximumAttempts: number;
  }>
) {
  const { error } = await supabase
    .from("exams")
    .update({
      ...(settings.title !== undefined && { title: settings.title }),
      ...(settings.positionTitle !== undefined && { position_title: settings.positionTitle }),
      ...(settings.department !== undefined && { department: settings.department }),
      ...(settings.passingScore !== undefined && { passing_score: settings.passingScore }),
      ...(settings.maximumAttempts !== undefined && { maximum_attempts: settings.maximumAttempts }),
    })
    .eq("id", examId);
  if (error) throw error;
}

/** Permanently removes a draft exam set (and its questions, via cascade). Published sets should be closed, not deleted. */
export async function deleteExamSet(examId: string) {
  const { error } = await supabase.from("exams").delete().eq("id", examId);
  if (error) throw error;
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
