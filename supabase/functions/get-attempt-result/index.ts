import { adminClient } from "../_shared/client.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";

const QUESTION_TYPE_LABELS: Record<string, string> = {
  multiple_choice: "Multiple Choice",
  true_false: "True or False",
  fill_blank: "Fill in the Blank",
  essay: "Essay",
};

/** Mirrors src/lib/examParts.ts's groupIntoParts + computePartBreakdown — kept as a
 *  standalone copy here since Edge Functions run in a separate Deno bundle from the
 *  frontend and can't share a module. Computed server-side so correct answers never
 *  reach the applicant's browser. */
function computePartBreakdown(
  questions: { id: string; question_type: string; points: number; correct_option_id: string; correct_answer_text: string }[],
  answers: Record<string, string>,
  essayScores: Record<string, number>
) {
  const parts: (typeof questions)[] = [];
  for (const q of questions) {
    const last = parts[parts.length - 1];
    if (last && last[0].question_type === q.question_type) last.push(q);
    else parts.push([q]);
  }
  return parts.map((part, i) => {
    const total = part.reduce((sum, q) => sum + (q.points ?? 0), 0);
    const pending = part[0].question_type === "essay" && part.some((q) => essayScores[q.id] === undefined);
    const earned = part.reduce((sum, q) => {
      if (q.question_type === "essay") return sum + (essayScores[q.id] ?? 0);
      const given = answers[q.id];
      const isCorrect =
        q.question_type === "fill_blank"
          ? typeof given === "string" && given.trim().toLowerCase() === (q.correct_answer_text ?? "").trim().toLowerCase()
          : given === q.correct_option_id;
      return sum + (isCorrect ? q.points ?? 0 : 0);
    }, 0);
    return {
      label: `Part ${i + 1}: ${QUESTION_TYPE_LABELS[part[0].question_type] ?? part[0].question_type}`,
      earned,
      total,
      pending,
    };
  });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { attemptId } = await req.json();
    if (!attemptId) return errorResponse("attemptId is required.");

    const admin = adminClient();
    const { data: a } = await admin.from("exam_attempts").select("*").eq("id", attemptId).maybeSingle();
    if (!a) return errorResponse("Result not found.", 404);

    const [{ data: applicant }, { data: category }, { data: exam }, { data: questions }] = await Promise.all([
      admin.from("applicants").select("*").eq("id", a.applicant_id).single(),
      admin.from("categories").select("*").eq("id", a.category_id).single(),
      admin.from("exams").select("*").eq("id", a.exam_id).single(),
      admin
        .from("exam_questions")
        .select("id, order, question_type, points, correct_option_id, correct_answer_text")
        .eq("exam_id", a.exam_id)
        .order("order", { ascending: true }),
    ]);

    const parts = computePartBreakdown(questions ?? [], a.answers ?? {}, a.essay_scores ?? {});

    return jsonResponse({
      attempt: {
        id: a.id,
        applicantId: a.applicant_id,
        categoryId: a.category_id,
        examId: a.exam_id,
        attemptNumber: a.attempt_number,
        status: a.status,
        startedAt: a.started_at ?? undefined,
        submittedAt: a.submitted_at ?? undefined,
        earnedPoints: a.earned_points ?? undefined,
        totalPoints: a.total_points ?? undefined,
        percentage: a.percentage ?? undefined,
        result: a.result ?? undefined,
        resultReferenceNumber: a.result_reference_number ?? undefined,
        needsReview: a.needs_review ?? false,
        parts,
      },
      applicant: {
        id: applicant.id,
        firstName: applicant.first_name,
        lastName: applicant.last_name,
        email: applicant.email,
        mobileNumber: applicant.mobile_number,
        applicantReferenceNumber: applicant.applicant_reference_number ?? undefined,
      },
      category: {
        id: category.id,
        name: category.name,
      },
      exam: {
        id: exam.id,
        title: exam.title,
        positionTitle: exam.position_title,
      },
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unexpected error", 500);
  }
});
