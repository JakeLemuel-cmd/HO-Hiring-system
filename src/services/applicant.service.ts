import { supabase, invokeFunction } from "@/lib/supabase";
import { normalizeEmail } from "@/lib/validation";
import type { AttemptResultRow, ExamAttemptDocument, PublicExamInformation } from "@/types";

function mapAttempt(row: any): ExamAttemptDocument {
  return {
    id: row.id,
    applicantId: row.applicant_id,
    categoryId: row.category_id,
    examId: row.exam_id,
    attemptNumber: row.attempt_number,
    status: row.status,
    startedAt: row.started_at ?? undefined,
    expiresAt: row.expires_at ?? undefined,
    submittedAt: row.submitted_at ?? undefined,
    durationSeconds: row.duration_seconds ?? undefined,
    earnedPoints: row.earned_points ?? undefined,
    totalPoints: row.total_points ?? undefined,
    percentage: row.percentage ?? undefined,
    result: row.result ?? undefined,
    resultReferenceNumber: row.result_reference_number ?? undefined,
    submissionReason: row.submission_reason ?? undefined,
    answers: row.answers ?? undefined,
    needsReview: row.needs_review ?? false,
    essayScores: row.essay_scores ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export async function getPublicExamInformation(publicCode: string): Promise<PublicExamInformation> {
  return invokeFunction<PublicExamInformation>("get-public-exam-information", { publicCode });
}

export async function registerAndStartAttempt(payload: {
  publicCode: string;
  fullName: string;
  contactNumber: string;
  email: string;
  applicantReferenceNumber?: string;
}): Promise<{ attemptId: string; expiresAt: string | null; questions: unknown[] }> {
  return invokeFunction("start-exam-attempt", {
    publicCode: payload.publicCode,
    fullName: payload.fullName,
    contactNumber: payload.contactNumber,
    email: normalizeEmail(payload.email),
    applicantReferenceNumber: payload.applicantReferenceNumber,
  });
}

export async function saveExamAnswers(attemptId: string, answers: Record<string, string>) {
  await invokeFunction("save-exam-answers", { attemptId, answers });
}

export async function submitExamAttempt(attemptId: string, answers: Record<string, string>) {
  return invokeFunction<{
    attemptId: string;
    earnedPoints: number;
    totalPoints: number;
    percentage: number | null;
    result: "passed" | "failed" | null;
    resultReferenceNumber: string;
    needsReview: boolean;
  }>("submit-exam-attempt", { attemptId, answers });
}

/** Staff-only: scores an attempt's essay questions (0..points each) and finalizes the result. */
export async function gradeEssayAnswers(attemptId: string, scores: Record<string, number>) {
  return invokeFunction<{
    attemptId: string;
    earnedPoints: number;
    totalPoints: number;
    percentage: number;
    result: "passed" | "failed";
  }>("grade-essay-answers", { attemptId, scores });
}


export async function getApplicantHistory(applicantId: string): Promise<ExamAttemptDocument[]> {
  const { data } = await supabase.from("exam_attempts").select("*").eq("applicant_id", applicantId);
  return (data ?? []).map(mapAttempt);
}

/** Every completed examination attempt across all hiring categories, newest first. */
export function subscribeToAllAttemptResults(callback: (rows: AttemptResultRow[]) => void) {
  async function load() {
    const { data } = await supabase
      .from("exam_attempts")
      .select("*, applicants(first_name, last_name), categories(name), exams(position_title)")
      .eq("status", "completed")
      .order("submitted_at", { ascending: false });
    callback(
      (data ?? []).map((row: any) => ({
        attemptId: row.id,
        applicantId: row.applicant_id,
        applicantName: `${row.applicants?.first_name ?? ""} ${row.applicants?.last_name ?? ""}`.trim(),
        categoryId: row.category_id,
        categoryName: row.categories?.name ?? "",
        positionTitle: row.exams?.position_title ?? "",
        examId: row.exam_id,
        status: row.status,
        result: row.result ?? undefined,
        earnedPoints: row.earned_points ?? undefined,
        totalPoints: row.total_points ?? undefined,
        percentage: row.percentage ?? undefined,
        submittedAt: row.submitted_at ?? undefined,
        needsReview: row.needs_review ?? false,
        essayScores: row.essay_scores ?? undefined,
        answers: row.answers ?? {},
      }))
    );
  }
  load();

  const channel = supabase
    .channel("all-attempt-results")
    .on("postgres_changes", { event: "*", schema: "public", table: "exam_attempts" }, load)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
