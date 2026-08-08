import { adminClient } from "../_shared/client.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { attemptId } = await req.json();
    if (!attemptId) return errorResponse("attemptId is required.");

    const admin = adminClient();
    const { data: attempt } = await admin.from("exam_attempts").select("exam_id").eq("id", attemptId).maybeSingle();
    if (!attempt) return errorResponse("Examination attempt not found.", 404);

    const { data: questions } = await admin
      .from("exam_questions")
      .select("id, order, question_type, question_text, options, points")
      .eq("exam_id", attempt.exam_id)
      .order("order", { ascending: true });

    const { data: exam } = await admin
      .from("exams")
      .select("custom_directions")
      .eq("id", attempt.exam_id)
      .maybeSingle();

    return jsonResponse({
      questions: (questions ?? []).map((q) => ({
        id: q.id,
        order: q.order,
        type: q.question_type,
        questionText: q.question_text,
        options: q.options,
        points: q.points,
      })),
      customDirections: exam?.custom_directions ?? {},
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unexpected error", 500);
  }
});
