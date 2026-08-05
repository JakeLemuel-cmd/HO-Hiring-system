import { adminClient, requireStaff } from "../_shared/client.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user, profile } = await requireStaff(req.headers.get("Authorization"));
    const { examId, openingDate, closingDate, durationMinutes } = await req.json();
    if (!examId) return errorResponse("examId is required.");

    const admin = adminClient();
    const { data: exam } = await admin.from("exams").select("category_id").eq("id", examId).maybeSingle();
    if (!exam) return errorResponse("Examination not found.", 404);

    const updates: Record<string, unknown> = {
      availability_status: openingDate && new Date(openingDate) > new Date() ? "scheduled" : "open",
      closed_at: null,
      closed_by: null,
      closing_reason: "",
    };
    if (openingDate) updates.opening_date = openingDate;
    if (closingDate) updates.closing_date = closingDate;
    if (durationMinutes) updates.duration_minutes = durationMinutes;

    const { error } = await admin.from("exams").update(updates).eq("id", examId);
    if (error) throw error;

    await admin.from("audit_logs").insert({
      user_id: user.id,
      user_name: `${profile.first_name} ${profile.last_name}`,
      action: "exam_reopened",
      entity_type: "exam",
      entity_id: examId,
      description: "Reopened examination",
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
