import { adminClient } from "../_shared/client.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";

function resolveEffectiveStatus(exam: any): string {
  const now = Date.now();
  if (exam.availability_status === "open" && exam.opening_date && new Date(exam.opening_date).getTime() > now) {
    return "scheduled";
  }
  if (exam.availability_status === "open" && exam.closing_date && new Date(exam.closing_date).getTime() < now) {
    return "expired";
  }
  return exam.availability_status;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { publicCode } = await req.json();
    if (!publicCode) return errorResponse("publicCode is required.");

    const admin = adminClient();
    const { data: exam } = await admin.from("exams").select("*").eq("public_code", publicCode).maybeSingle();
    if (!exam) return errorResponse("This examination link is invalid or no longer available.", 404);

    const { data: category } = await admin.from("categories").select("*").eq("id", exam.category_id).single();

    return jsonResponse({
      title: exam.title,
      categoryName: category.name,
      positionTitle: category.position_title,
      instructions: exam.instructions,
      questionCount: exam.question_count,
      hasTimeLimit: exam.has_time_limit,
      durationMinutes: exam.duration_minutes,
      passingScore: exam.passing_score ?? null,
      availabilityStatus: resolveEffectiveStatus(exam),
      openingDate: exam.opening_date ?? undefined,
      closingDate: exam.closing_date ?? undefined,
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unexpected error", 500);
  }
});
