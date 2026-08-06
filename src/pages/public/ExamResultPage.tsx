import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { invokeFunction, PUBLIC_APP_URL } from "@/lib/supabase";
import type { ApplicantDocument, CategoryDocument, ExamAttemptDocument, ExamDocument } from "@/types";
import { generateResultPdf, downloadBlob } from "@/lib/pdf";
import { StatusBadge } from "@/components/common/StatusBadge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/Misc";
import { PublicExamHeader } from "@/components/common/PublicExamHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface AttemptResultResponse {
  attempt: ExamAttemptDocument;
  applicant: ApplicantDocument;
  category: CategoryDocument;
  exam: ExamDocument;
}

export function ExamResultPage() {
  const { attemptId } = useParams();
  const [result, setResult] = useState<AttemptResultResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const downloadedOnce = useRef(false);

  useEffect(() => {
    if (!attemptId) return;
    invokeFunction<AttemptResultResponse>("get-attempt-result", { attemptId })
      .then(setResult)
      .catch(() => setError("We couldn't load this result. The link may be invalid."));
  }, [attemptId]);

  useEffect(() => {
    if (!result || result.attempt.status !== "completed" || result.attempt.needsReview || downloadedOnce.current) return;
    downloadedOnce.current = true;
    triggerDownload();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [result]);

  async function triggerDownload() {
    if (!result) return;
    const { attempt, applicant, category, exam } = result;
    const { blob, filename } = await generateResultPdf({
      applicantName: `${applicant.firstName} ${applicant.lastName}`,
      email: applicant.email,
      applicantReferenceNumber: applicant.applicantReferenceNumber,
      categoryName: category.name,
      positionTitle: category.positionTitle,
      examTitle: exam.title,
      examDate: attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : "",
      rawScore: attempt.earnedPoints ?? 0,
      totalPoints: attempt.totalPoints ?? 0,
      percentage: attempt.percentage ?? 0,
      result: attempt.result ?? "failed",
      attemptNumber: attempt.attemptNumber,
      resultReferenceNumber: attempt.resultReferenceNumber ?? "",
      verificationUrl: `${PUBLIC_APP_URL}/exam/verify/${attempt.resultReferenceNumber}`,
      parts: attempt.parts,
    });
    downloadBlob(blob, filename);
  }

  if (error) {
    return (
      <div className="mx-auto max-w-md p-8">
        <ErrorState message={error} />
      </div>
    );
  }

  if (!result) return <LoadingSkeleton />;
  const { attempt, applicant, category } = result;

  if (attempt.needsReview) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
        <Card className="w-full max-w-md text-center">
          <CardContent className="pt-6">
            <PublicExamHeader />
            <div className="mt-3 flex justify-center">
              <StatusBadge status="pending_review" />
            </div>
            <p className="mt-4 text-sm text-foreground">
              Your examination has been submitted and includes questions that require manual review.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Your result will be available once staff finish grading. Please check back later.
            </p>
            <p className="mt-4 text-xs text-muted-foreground">Examinee No. {attempt.resultReferenceNumber}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Applicant: {applicant.firstName} {applicant.lastName}
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-6">
          <PublicExamHeader />
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            {attempt.earnedPoints} / {attempt.totalPoints}
          </h1>
          <p className="text-muted-foreground">{attempt.percentage}%</p>
          <div className="mt-3 flex justify-center">{attempt.result && <StatusBadge status={attempt.result} />}</div>

          {attempt.parts && attempt.parts.length > 1 && (
            <div className="mt-4 space-y-1 rounded-md border border-border bg-muted/40 p-3 text-left text-sm">
              {attempt.parts.map((part) => (
                <div key={part.label} className="flex justify-between">
                  <span className="text-muted-foreground">{part.label}</span>
                  <span className="font-medium text-foreground">
                    {part.earned}/{part.total}
                  </span>
                </div>
              ))}
            </div>
          )}

          <p className="mt-4 text-xs text-muted-foreground">Examinee No. {attempt.resultReferenceNumber}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            Applicant: {applicant.firstName} {applicant.lastName}
          </p>

          <Button onClick={triggerDownload} className="mt-6 w-full">
            Download Result PDF
          </Button>
          <p className="mt-3 text-xs text-muted-foreground">
            Your result PDF should download automatically. Use the button above if it was blocked by your browser.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
