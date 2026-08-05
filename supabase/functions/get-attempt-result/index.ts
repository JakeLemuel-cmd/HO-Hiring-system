import { adminClient } from "../_shared/client.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { attemptId } = await req.json();
    if (!attemptId) return errorResponse("attemptId is required.");

    const admin = adminClient();
    const { data: a } = await admin.from("exam_attempts").select("*").eq("id", attemptId).maybeSingle();
    if (!a) return errorResponse("Result not found.", 404);

    const [{ data: applicant }, { data: category }, { data: exam }] = await Promise.all([
      admin.from("applicants").select("*").eq("id", a.applicant_id).single(),
      admin.from("categories").select("*").eq("id", a.category_id).single(),
      admin.from("exams").select("*").eq("id", a.exam_id).single(),
    ]);

    return jsonResponse({
      attempt: {
        id: a.id,
        applicantId: a.applicant_id,
        categoryId: a.category_id,
        examId: a.exam_id,
        attemptNumber: a.attempt_number,
        status: a.status,
        submittedAt: a.submitted_at ?? undefined,
        earnedPoints: a.earned_points ?? undefined,
        totalPoints: a.total_points ?? undefined,
        percentage: a.percentage ?? undefined,
        result: a.result ?? undefined,
        resultReferenceNumber: a.result_reference_number ?? undefined,
      },
      applicant: {
        id: applicant.id,
        firstName: applicant.first_name,
        lastName: applicant.last_name,
        email: applicant.email,
        applicantReferenceNumber: applicant.applicant_reference_number ?? undefined,
      },
      category: {
        id: category.id,
        name: category.name,
        positionTitle: category.position_title,
      },
      exam: {
        id: exam.id,
        title: exam.title,
      },
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unexpected error", 500);
  }
});
