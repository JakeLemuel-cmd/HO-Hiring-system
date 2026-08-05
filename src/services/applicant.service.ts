import { supabase, invokeFunction } from "@/lib/supabase";
import { normalizeEmail, normalizeFullName } from "@/lib/validation";
import type { ApplicantDocument, ExamAttemptDocument, PublicExamInformation } from "@/types";

function mapApplicant(row: any): ApplicantDocument {
  return {
    id: row.id,
    firstName: row.first_name,
    middleName: row.middle_name ?? undefined,
    lastName: row.last_name,
    normalizedFullName: row.normalized_full_name,
    email: row.email,
    normalizedEmail: row.normalized_email,
    mobileNumber: row.mobile_number,
    applicantReferenceNumber: row.applicant_reference_number ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

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
    percentage: number;
    result: "passed" | "failed";
    resultReferenceNumber: string;
  }>("submit-exam-attempt", { attemptId, answers });
}

export async function searchApplicants(term: string): Promise<ApplicantDocument[]> {
  const normalizedEmail = normalizeEmail(term);
  const normalizedName = normalizeFullName(term);
  const results = new Map<string, ApplicantDocument>();

  const [byEmail, byName] = await Promise.all([
    supabase.from("applicants").select("*").eq("normalized_email", normalizedEmail),
    supabase.from("applicants").select("*").eq("normalized_full_name", normalizedName),
  ]);

  (byEmail.data ?? []).forEach((row) => results.set(row.id, mapApplicant(row)));
  (byName.data ?? []).forEach((row) => results.set(row.id, mapApplicant(row)));

  return Array.from(results.values());
}

export async function getApplicantHistory(applicantId: string): Promise<ExamAttemptDocument[]> {
  const { data } = await supabase.from("exam_attempts").select("*").eq("applicant_id", applicantId);
  return (data ?? []).map(mapAttempt);
}
