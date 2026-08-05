import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { invokeFunction, PUBLIC_APP_URL } from "@/lib/supabase";
import type { ApplicantDocument, CategoryDocument, ExamAttemptDocument, ExamDocument } from "@/types";
import { generateResultPdf, downloadBlob } from "@/lib/pdf";
import { StatusBadge } from "@/components/common/StatusBadge";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/Misc";
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
    if (!result || result.attempt.status !== "completed" || downloadedOnce.current) return;
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md text-center">
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">
            {category.name} — {category.positionTitle}
          </p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight text-foreground">
            {attempt.earnedPoints} / {attempt.totalPoints}
          </h1>
          <p className="text-muted-foreground">{attempt.percentage}%</p>
          <div className="mt-3 flex justify-center">{attempt.result && <StatusBadge status={attempt.result} />}</div>
          <p className="mt-4 text-xs text-muted-foreground">Reference No. {attempt.resultReferenceNumber}</p>
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
