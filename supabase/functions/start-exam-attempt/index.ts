import { adminClient, normalizeEmail, normalizeFullName } from "../_shared/client.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { publicCode, fullName, contactNumber, email, applicantReferenceNumber } = await req.json();

    if (!publicCode || !fullName || fullName.trim().length < 2 || !contactNumber || !email) {
      return errorResponse("Full name, contact number, and email are required.");
    }

    const admin = adminClient();
    const { data: exam } = await admin.from("exams").select("*").eq("public_code", publicCode).maybeSingle();
    if (!exam) return errorResponse("This examination link is invalid or no longer available.", 404);

    const { data: category } = await admin.from("categories").select("name").eq("id", exam.category_id).maybeSingle();

    const now = Date.now();
    if (exam.availability_status !== "open") {
      return errorResponse("This examination is not currently open.", 409);
    }
    if (exam.opening_date && new Date(exam.opening_date).getTime() > now) {
      return errorResponse("This examination has not opened yet.", 409);
    }
    if (exam.closing_date && new Date(exam.closing_date).getTime() < now) {
      return errorResponse("This examination has already closed.", 409);
    }

    const normalizedEmail = normalizeEmail(email);
    const normalizedFullName = normalizeFullName(fullName);

    // Postgres row-level uniqueness constraints aren't declared here (attempt counts depend on a
    // per-exam maximumAttempts setting), so duplicate-attempt protection is enforced by re-checking
    // the count immediately before insert — acceptable for this MVP's low-concurrency access pattern.
    let applicantId: string;
    const { data: existingApplicant } = await admin
      .from("applicants")
      .select("id")
      .eq("normalized_email", normalizedEmail)
      .maybeSingle();

    if (existingApplicant) {
      applicantId = existingApplicant.id;
    } else {
      const [firstName, ...rest] = fullName.trim().split(" ");
      const { data: created, error } = await admin
        .from("applicants")
        .insert({
          first_name: firstName,
          last_name: rest.join(" ") || firstName,
          normalized_full_name: normalizedFullName,
          email: normalizedEmail,
          normalized_email: normalizedEmail,
          mobile_number: contactNumber,
          applicant_reference_number: applicantReferenceNumber ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      applicantId = created.id;
    }

    const { data: existingAttempts } = await admin
      .from("exam_attempts")
      .select("id")
      .eq("exam_id", exam.id)
      .eq("applicant_id", applicantId);

    const maximumAttempts = exam.maximum_attempts ?? 1;
    if ((existingAttempts?.length ?? 0) >= maximumAttempts) {
      return errorResponse("You have already reached the maximum number of attempts for this examination.", 409);
    }

    const startedAt = new Date().toISOString();
    const expiresAt = exam.has_time_limit
      ? new Date(now + (exam.duration_minutes ?? 30) * 60 * 1000).toISOString()
      : null;

    const { data: attempt, error: attemptError } = await admin
      .from("exam_attempts")
      .insert({
        applicant_id: applicantId,
        category_id: exam.category_id,
        exam_id: exam.id,
        category_name: category?.name ?? "",
        exam_title: exam.title,
        position_title: exam.position_title,
        attempt_number: (existingAttempts?.length ?? 0) + 1,
        status: "in_progress",
        started_at: startedAt,
        expires_at: expiresAt,
        total_points: exam.total_points ?? 0,
        answers: {},
      })
      .select("id")
      .single();
    if (attemptError) throw attemptError;

    await admin.from("audit_logs").insert([
      {
        action: "applicant_registered",
        entity_type: "applicant",
        entity_id: applicantId,
        description: `Applicant ${normalizedEmail} registered for examination`,
        category_id: exam.category_id,
        exam_id: exam.id,
        applicant_id: applicantId,
      },
      {
        action: "attempt_started",
        entity_type: "examAttempt",
        entity_id: attempt.id,
        description: "Applicant started examination attempt",
        category_id: exam.category_id,
        exam_id: exam.id,
        applicant_id: applicantId,
        attempt_id: attempt.id,
      },
    ]);

    const { data: questions } = await admin
      .from("exam_questions")
      .select("id, order, question_text, options, points")
      .eq("exam_id", exam.id)
      .order("order", { ascending: true });

    return jsonResponse({
      attemptId: attempt.id,
      expiresAt,
      questions: (questions ?? []).map((q) => ({
        id: q.id,
        order: q.order,
        questionText: q.question_text,
        options: q.options,
        points: q.points,
      })),
    });
  } catch (err) {
    return errorResponse(err instanceof Error ? err.message : "Unexpected error", 500);
  }
});
