import { useEffect, useRef, useState } from "react";
import { useParams } from "react-router-dom";
import { Clock, CheckCircle2, XCircle, Download } from "lucide-react";
import { invokeFunction, PUBLIC_APP_URL } from "@/lib/supabase";
import type { ApplicantDocument, CategoryDocument, ExamAttemptDocument, ExamDocument } from "@/types";
import { generateResultPdf, downloadBlob } from "@/lib/pdf";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ErrorState } from "@/components/common/Misc";
import { PublicExamHeader } from "@/components/common/PublicExamHeader";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

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
    const examDurationSeconds =
      attempt.startedAt && attempt.submittedAt
        ? Math.round((new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000)
        : null;
    const { blob, filename } = await generateResultPdf({
      applicantName: `${applicant.firstName} ${applicant.lastName}`,
      contactNumber: applicant.mobileNumber,
      email: applicant.email,
      applicantReferenceNumber: applicant.applicantReferenceNumber,
      categoryName: category.name,
      positionTitle: exam.positionTitle,
      examTitle: exam.title,
      examDate: attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : "",
      examDurationSeconds,
      rawScore: attempt.earnedPoints ?? 0,
      totalPoints: attempt.totalPoints ?? 0,
      percentage: attempt.needsReview ? null : attempt.percentage ?? 0,
      result: attempt.needsReview ? null : attempt.result ?? "failed",
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

  const status: "pending" | "passed" | "failed" = attempt.needsReview
    ? "pending"
    : attempt.result === "passed"
    ? "passed"
    : "failed";

  const statusStyles = {
    pending: { icon: Clock, ring: "bg-warning/10 text-warning", badge: "bg-warning/15 text-warning" },
    passed: { icon: CheckCircle2, ring: "bg-success/10 text-success", badge: "bg-success/15 text-success" },
    failed: { icon: XCircle, ring: "bg-destructive/10 text-destructive", badge: "bg-destructive/15 text-destructive" },
  }[status];
  const StatusIcon = statusStyles.icon;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-md overflow-hidden">
        <CardContent className="pt-6 text-center">
          <PublicExamHeader />

          {status !== "pending" && (
            <div className={cn("mx-auto mt-4 flex h-16 w-16 items-center justify-center rounded-full", statusStyles.ring)}>
              <StatusIcon className="h-8 w-8" />
            </div>
          )}

          {status === "pending" ? (
            <>
              <h1 className="mt-4 text-xl font-semibold text-foreground">Almost there</h1>
              <p className="mx-auto mt-1 max-w-xs text-sm text-muted-foreground">
                Your essay response is being reviewed. We'll finalize your score as soon as staff finish grading it.
              </p>
            </>
          ) : (
            <>
              <h1 className="mt-4 text-4xl font-bold tracking-tight text-foreground">{attempt.percentage}%</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                {attempt.earnedPoints} out of {attempt.totalPoints} points
              </p>
            </>
          )}

          <span
            className={cn(
              "mt-3 inline-block rounded-full px-3 py-1 text-xs font-semibold capitalize",
              statusStyles.badge
            )}
          >
            {status === "pending" ? "Pending Review" : status}
          </span>

          {status !== "pending" && attempt.parts && attempt.parts.length > 1 && (
            <div className="mt-5 divide-y divide-border overflow-hidden rounded-lg border border-border text-left text-sm">
              {attempt.parts.map((part) => (
                <div key={part.label} className="flex items-center justify-between gap-3 bg-card px-3 py-2.5">
                  <span className="text-foreground">{part.label}</span>
                  {part.pending ? (
                    <span className="text-xs font-medium text-warning">Pending</span>
                  ) : (
                    <span className="font-semibold text-foreground">
                      {part.earned}/{part.total}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-5 rounded-lg bg-muted/50 px-4 py-3 text-left text-xs text-muted-foreground">
            <div className="flex justify-between">
              <span>Examinee No.</span>
              <span className="font-medium text-foreground">{attempt.resultReferenceNumber}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span>Applicant</span>
              <span className="font-medium text-foreground">
                {applicant.firstName} {applicant.lastName}
              </span>
            </div>
          </div>

          <Button onClick={triggerDownload} className="mt-5 w-full gap-2">
            <Download className="h-4 w-4" />
            Download Result PDF
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
