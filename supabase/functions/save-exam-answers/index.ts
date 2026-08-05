import { adminClient } from "../_shared/client.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { attemptId, answers } = await req.json();
    if (!attemptId) return errorResponse("attemptId is required.");

    const admin = adminClient();
    const { data: attempt } = await admin.from("exam_attempts").select("*").eq("id", attemptId).maybeSingle();
    if (!attempt) return errorResponse("Examination attempt not found.", 404);

    if (attempt.status !== "in_progress") {
      return errorResponse("This attempt can no longer be modified.", 409);
    }
    if (attempt.expires_at && new Date(attempt.expires_at).getTime() < Date.now()) {
      return errorResponse("The examination time has expired.", 409);
    }

    const { error } = await admin.from("exam_attempts").update({ answers }).eq("id", attemptId);
    if (error) throw error;

    return jsonResponse({ success: true });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unexpected error", 500);
  }
});
