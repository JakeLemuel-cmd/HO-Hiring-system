import { adminClient, requireStaff } from "../_shared/client.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user, profile } = await requireStaff(req.headers.get("Authorization"));
    const { attemptId, scores } = await req.json();
    if (!attemptId) return errorResponse("attemptId is required.");
    if (!scores || typeof scores !== "object") return errorResponse("scores is required.");

    const admin = adminClient();
    const { data: attempt } = await admin.from("exam_attempts").select("*").eq("id", attemptId).maybeSingle();
    if (!attempt) return errorResponse("Examination attempt not found.", 404);
    if (attempt.status !== "completed") return errorResponse("This attempt has not been submitted yet.", 409);

    const [{ data: category }, { data: exam }, { data: questions }] = await Promise.all([
      admin.from("categories").select("passing_score").eq("id", attempt.category_id).single(),
      admin.from("exams").select("passing_score").eq("id", attempt.exam_id).single(),
      admin.from("exam_questions").select("id, points, question_type").eq("exam_id", attempt.exam_id),
    ]);

    const essayQuestions = (questions ?? []).filter((q) => q.question_type === "essay");
    if (essayQuestions.length === 0) return errorResponse("This examination has no essay questions to grade.", 409);

    const cleanScores: Record<string, number> = {};
    for (const q of essayQuestions) {
      const raw = scores[q.id];
      const value = Number(raw);
      if (raw === undefined || Number.isNaN(value) || value < 0 || value > (q.points ?? 0)) {
        return errorResponse(`Score for question ${q.id} must be between 0 and ${q.points}.`);
      }
      cleanScores[q.id] = value;
    }

    // attempt.earned_points already holds the auto-graded total from submission time (essay
    // questions contributed 0); subtract any prior essay score before adding the new one, so
    // re-grading an already-reviewed attempt doesn't double-count.
    const essayEarned = Object.values(cleanScores).reduce((sum, v) => sum + v, 0);
    const priorEssayEarned = Object.values((attempt.essay_scores as Record<string, number>) ?? {}).reduce(
      (sum, v) => sum + v,
      0
    );
    const earnedPoints = (attempt.earned_points ?? 0) - priorEssayEarned + essayEarned;
    const totalPoints = attempt.total_points ?? 0;
    const percentage = totalPoints > 0 ? Math.round((earnedPoints / totalPoints) * 100) : 0;
    const passingScore = category?.passing_score ?? exam?.passing_score ?? 70;
    const result = percentage >= passingScore ? "passed" : "failed";

    const { error } = await admin
      .from("exam_attempts")
      .update({
        earned_points: earnedPoints,
        percentage,
        result,
        essay_scores: cleanScores,
        needs_review: false,
      })
      .eq("id", attemptId);
    if (error) throw error;

    await admin.from("audit_logs").insert({
      user_id: user.id,
      user_name: `${profile.first_name} ${profile.last_name}`,
      action: "attempt_manually_graded",
      entity_type: "examAttempt",
      entity_id: attemptId,
      description: "Essay questions scored and result finalized",
      category_id: attempt.category_id,
      exam_id: attempt.exam_id,
      applicant_id: attempt.applicant_id,
      attempt_id: attemptId,
    });

    return jsonResponse({ attemptId, earnedPoints, totalPoints, percentage, result });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "PERMISSION_DENIED" ? 403 : 500;
    return errorResponse(status === 500 ? message : "You are not authorized to perform this action.", status);
  }
});
