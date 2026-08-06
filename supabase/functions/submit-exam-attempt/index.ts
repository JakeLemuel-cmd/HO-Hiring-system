import { adminClient, randomReferenceNumber } from "../_shared/client.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";

type SubmissionReason = "applicant_submitted" | "time_expired" | "exam_closed_by_staff";

async function scoreAndFinalize(
  admin: ReturnType<typeof adminClient>,
  attempt: any,
  answers: Record<string, string>,
  submissionReason: SubmissionReason
) {
  if (attempt.status === "completed") {
    return {
      attemptId: attempt.id,
      earnedPoints: attempt.earned_points,
      totalPoints: attempt.total_points,
      percentage: attempt.percentage,
      result: attempt.result,
      resultReferenceNumber: attempt.result_reference_number,
      needsReview: attempt.needs_review ?? false,
    };
  }

  const [{ data: category }, { data: exam }, { data: questions }] = await Promise.all([
    admin.from("categories").select("passing_score").eq("id", attempt.category_id).single(),
    admin.from("exams").select("passing_score").eq("id", attempt.exam_id).single(),
    admin
      .from("exam_questions")
      .select("id, points, question_type, correct_option_id, correct_answer_text")
      .eq("exam_id", attempt.exam_id),
  ]);

  // Essay questions aren't auto-gradable — their points still count toward the total,
  // but are excluded from earnedPoints/result until staff manually score them.
  let earnedPoints = 0;
  let totalPoints = 0;
  let hasEssay = false;
  for (const q of questions ?? []) {
    totalPoints += q.points ?? 0;
    if (q.question_type === "essay") {
      hasEssay = true;
      continue;
    }
    const given = answers[q.id];
    const isCorrect =
      q.question_type === "fill_blank"
        ? typeof given === "string" && given.trim().toLowerCase() === (q.correct_answer_text ?? "").trim().toLowerCase()
        : given === q.correct_option_id;
    if (isCorrect) earnedPoints += q.points ?? 0;
  }

  const passingScore = category?.passing_score ?? exam?.passing_score ?? 70;
  const percentage = hasEssay ? null : totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
  const result = hasEssay ? null : percentage! >= passingScore ? "passed" : "failed";
  const resultReferenceNumber = randomReferenceNumber();

  const { error } = await admin
    .from("exam_attempts")
    .update({
      answers,
      status: "completed",
      submitted_at: new Date().toISOString(),
      earned_points: earnedPoints,
      total_points: totalPoints,
      percentage,
      result,
      result_reference_number: resultReferenceNumber,
      submission_reason: submissionReason,
      needs_review: hasEssay,
    })
    .eq("id", attempt.id);
  if (error) throw error;

  await admin.from("audit_logs").insert({
    action: submissionReason === "time_expired" ? "attempt_auto_submitted" : "attempt_submitted",
    entity_type: "examAttempt",
    entity_id: attempt.id,
    description: `Examination submitted (${submissionReason})${hasEssay ? " — pending manual review" : ""}`,
    category_id: attempt.category_id,
    exam_id: attempt.exam_id,
    applicant_id: attempt.applicant_id,
    attempt_id: attempt.id,
  });

  return { attemptId: attempt.id, earnedPoints, totalPoints, percentage, result, resultReferenceNumber, needsReview: hasEssay };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { attemptId, answers } = await req.json();
    if (!attemptId) return errorResponse("attemptId is required.");

    const admin = adminClient();
    const { data: attempt } = await admin.from("exam_attempts").select("*").eq("id", attemptId).maybeSingle();
    if (!attempt) return errorResponse("Examination attempt not found.", 404);

    if (attempt.status === "completed") {
      const result = await scoreAndFinalize(admin, attempt, attempt.answers ?? {}, attempt.submission_reason ?? "applicant_submitted");
      return jsonResponse(result);
    }
    if (attempt.status !== "in_progress") {
      return errorResponse("This attempt cannot be submitted.", 409);
    }

    const isExpired = attempt.expires_at && new Date(attempt.expires_at).getTime() < Date.now();
    const result = await scoreAndFinalize(
      admin,
      attempt,
      answers ?? attempt.answers ?? {},
      isExpired ? "time_expired" : "applicant_submitted"
    );
    return jsonResponse(result);
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unexpected error", 500);
  }
});
