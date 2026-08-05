import { adminClient } from "../_shared/client.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { attemptId } = await req.json();
    if (!attemptId) return errorResponse("attemptId is required.");

    const admin = adminClient();
    const { data: a } = await admin.from("exam_attempts").select("*").eq("id", attemptId).maybeSingle();
    if (!a) return errorResponse("Examination attempt not found.", 404);

    return jsonResponse({
      attempt: {
        id: a.id,
        applicantId: a.applicant_id,
        categoryId: a.category_id,
        examId: a.exam_id,
        attemptNumber: a.attempt_number,
        status: a.status,
        startedAt: a.started_at ?? undefined,
        expiresAt: a.expires_at ?? undefined,
        submittedAt: a.submitted_at ?? undefined,
        earnedPoints: a.earned_points ?? undefined,
        totalPoints: a.total_points ?? undefined,
        percentage: a.percentage ?? undefined,
        result: a.result ?? undefined,
        resultReferenceNumber: a.result_reference_number ?? undefined,
        answers: a.answers ?? {},
      },
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unexpected error", 500);
  }
});
