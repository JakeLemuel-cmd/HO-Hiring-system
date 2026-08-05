import { adminClient, requireStaff } from "../_shared/client.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user, profile } = await requireStaff(req.headers.get("Authorization"));
    const { examId, reason, behavior } = await req.json();
    if (!examId) return errorResponse("examId is required.");

    const admin = adminClient();
    const { data: exam } = await admin.from("exams").select("*").eq("id", examId).maybeSingle();
    if (!exam) return errorResponse("Examination not found.", 404);

    const { error } = await admin
      .from("exams")
      .update({
        availability_status: "closed",
        closed_at: new Date().toISOString(),
        closed_by: user.id,
        closing_reason: reason ?? "",
        ...(behavior && { close_exam_behavior: behavior }),
      })
      .eq("id", examId);
    if (error) throw error;

    if (behavior === "submit_active_attempts_immediately") {
      await admin
        .from("exam_attempts")
        .update({
          status: "expired",
          submission_reason: "exam_closed_by_staff",
          submitted_at: new Date().toISOString(),
        })
        .eq("exam_id", examId)
        .eq("status", "in_progress");
    }

    await admin.from("audit_logs").insert({
      user_id: user.id,
      user_name: `${profile.first_name} ${profile.last_name}`,
      action: "exam_closed",
      entity_type: "exam",
      entity_id: examId,
      description: reason ? `Closed examination: ${reason}` : "Closed examination",
      category_id: exam.category_id,
      exam_id: examId,
    });

    return jsonResponse({ success: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "PERMISSION_DENIED" ? 403 : 500;
    return errorResponse(status === 500 ? message : "You are not authorized to perform this action.", status);
  }
});
