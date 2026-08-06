import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { supabase, PUBLIC_APP_URL } from "@/lib/supabase";
import { PageHeader } from "@/components/common/Misc";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { getApplicantHistory } from "@/services/applicant.service";
import { getCategory } from "@/services/category.service";
import { generateApplicantHistoryPdf, generateResultPdf, downloadBlob } from "@/lib/pdf";
import { computePartBreakdown } from "@/lib/examParts";
import type { ApplicantDocument, CategoryDocument, ExamAttemptDocument } from "@/types";

interface EnrichedAttempt {
  attempt: ExamAttemptDocument;
  category: CategoryDocument | null;
}

function mapApplicant(row: any): ApplicantDocument {
  return {
    id: row.id,
    firstName: row.first_name,
    middleName: row.middle_name ?? undefined,
    lastName: row.last_name,
    normalizedFullName: row.normalized_full_name,
    email: row.email,
    normalizedEmail: row.normalized_email,
    mobileNumber: row.mobile_number,
    applicantReferenceNumber: row.applicant_reference_number ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function ApplicantProfilePage() {
  const { applicantId } = useParams();
  const [applicant, setApplicant] = useState<ApplicantDocument | null>(null);
  const [attempts, setAttempts] = useState<EnrichedAttempt[]>([]);

  useEffect(() => {
    if (!applicantId) return;
    supabase
      .from("applicants")
      .select("*")
      .eq("id", applicantId)
      .maybeSingle()
      .then(({ data }) => setApplicant(data ? mapApplicant(data) : null));

    getApplicantHistory(applicantId).then(async (list) => {
      const enriched = await Promise.all(
        list
          .filter((a) => a.status === "completed")
          .map(async (attempt) => ({ attempt, category: await getCategory(attempt.categoryId) }))
      );
      setAttempts(enriched);
    });
  }, [applicantId]);

  if (!applicant) return null;

  async function downloadIndividual(row: EnrichedAttempt) {
    const { attempt, category } = row;
    const { data: questions } = await supabase
      .from("exam_questions")
      .select("id, order, question_type, points, correct_option_id, correct_answer_text")
      .eq("exam_id", attempt.examId)
      .order("order", { ascending: true });
    const parts = computePartBreakdown(
      (questions ?? []).map((q) => ({
        id: q.id,
        type: q.question_type,
        points: q.points,
        correctOptionId: q.correct_option_id,
        correctAnswerText: q.correct_answer_text,
      })),
      attempt.answers ?? {},
      attempt.essayScores
    );

    const { blob, filename } = await generateResultPdf({
      applicantName: `${applicant!.firstName} ${applicant!.lastName}`,
      email: applicant!.email,
      applicantReferenceNumber: applicant!.applicantReferenceNumber,
      categoryName: category?.name ?? "",
      positionTitle: category?.positionTitle ?? "",
      examTitle: `${category?.name ?? ""} Examination`,
      examDate: attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : "",
      rawScore: attempt.earnedPoints ?? 0,
      totalPoints: attempt.totalPoints ?? 0,
      percentage: attempt.percentage ?? 0,
      result: attempt.result ?? "failed",
      attemptNumber: attempt.attemptNumber,
      resultReferenceNumber: attempt.resultReferenceNumber ?? "",
      verificationUrl: `${PUBLIC_APP_URL}/exam/verify/${attempt.resultReferenceNumber}`,
      parts,
    });
    downloadBlob(blob, filename);
  }

  function downloadConsolidated() {
    const { blob, filename } = generateApplicantHistoryPdf({
      applicantName: `${applicant!.firstName} ${applicant!.lastName}`,
      email: applicant!.email,
      applicantReferenceNumber: applicant!.applicantReferenceNumber,
      attempts: attempts.map(({ attempt, category }) => ({
        categoryName: category?.name ?? "",
        positionTitle: category?.positionTitle ?? "",
        percentage: attempt.percentage ?? 0,
        result: attempt.result ?? "failed",
        examDate: attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : "",
        attemptNumber: attempt.attemptNumber,
      })),
    });
    downloadBlob(blob, filename);
  }

  return (
    <div>
      <PageHeader
        title={`${applicant.firstName} ${applicant.lastName}`}
        description={applicant.email}
        actions={
          attempts.length > 0 ? (
            <Button onClick={downloadConsolidated}>Download Complete History PDF</Button>
          ) : undefined
        }
      />

      <div className="space-y-3">
        {attempts.map((row, i) => (
          <Card key={row.attempt.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-foreground">
                  {i + 1}. {row.category?.name} — {row.category?.positionTitle}
                </p>
                <p className="mt-0.5 flex items-center gap-1.5 text-sm text-muted-foreground">
                  Score: {row.attempt.percentage}% ·{" "}
                  {row.attempt.result && <StatusBadge status={row.attempt.result} />} · Attempt #
                  {row.attempt.attemptNumber}
                </p>
              </div>
              <Button variant="link" size="sm" className="h-auto p-0" onClick={() => downloadIndividual(row)}>
                Download Result
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
