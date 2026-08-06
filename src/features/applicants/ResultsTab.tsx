import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ResultReviewDialog } from "@/features/applicants/ResultReviewDialog";
import type { ApplicantDocument, ExamAttemptDocument } from "@/types";

function mapAttempt(row: any): ExamAttemptDocument {
  return {
    id: row.id,
    applicantId: row.applicant_id,
    categoryId: row.category_id,
    examId: row.exam_id,
    attemptNumber: row.attempt_number,
    status: row.status,
    earnedPoints: row.earned_points ?? undefined,
    totalPoints: row.total_points ?? undefined,
    percentage: row.percentage ?? undefined,
    result: row.result ?? undefined,
    resultReferenceNumber: row.result_reference_number ?? undefined,
    submittedAt: row.submitted_at ?? undefined,
    needsReview: row.needs_review ?? false,
    essayScores: row.essay_scores ?? undefined,
    answers: row.answers ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapApplicant(row: any): ApplicantDocument {
  return {
    id: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    normalizedFullName: row.normalized_full_name,
    email: row.email,
    normalizedEmail: row.normalized_email,
    mobileNumber: row.mobile_number,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function ResultsTab({ categoryId, passingScore }: { categoryId: string; passingScore: number }) {
  const [attempts, setAttempts] = useState<ExamAttemptDocument[]>([]);
  const [applicantsById, setApplicantsById] = useState<Map<string, ApplicantDocument>>(new Map());
  const [reviewingAttempt, setReviewingAttempt] = useState<ExamAttemptDocument | null>(null);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("category_id", categoryId)
        .eq("status", "completed");
      const mapped = (data ?? []).map(mapAttempt);
      setAttempts(mapped);

      const applicantIds = Array.from(new Set(mapped.map((a) => a.applicantId)));
      if (applicantIds.length > 0) {
        const { data: applicantRows } = await supabase.from("applicants").select("*").in("id", applicantIds);
        const map = new Map<string, ApplicantDocument>();
        (applicantRows ?? []).forEach((row) => map.set(row.id, mapApplicant(row)));
        setApplicantsById(map);
      }
    }
    load();

    const channel = supabase
      .channel(`category-results-${categoryId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "exam_attempts", filter: `category_id=eq.${categoryId}` },
        load
      )
      .subscribe();

    return () => {
    supabase.removeChannel(channel);
  };
  }, [categoryId]);

  if (attempts.length === 0) {
    return (
      <EmptyState
        title="No results yet"
        description={`Results will appear once applicants complete the examination. Passing score is set to ${passingScore}%.`}
      />
    );
  }

  function applicantName(applicantId: string) {
    const a = applicantsById.get(applicantId);
    return a ? `${a.firstName} ${a.lastName}` : "Unknown Applicant";
  }

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Examinee No.</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Percentage</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>Submitted</TableHead>
            <TableHead></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attempts.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-mono text-xs">{a.resultReferenceNumber}</TableCell>
              <TableCell>{a.earnedPoints} / {a.totalPoints}</TableCell>
              <TableCell>{a.percentage}%</TableCell>
              <TableCell>
                {a.needsReview ? <StatusBadge status="pending_review" /> : a.result && <StatusBadge status={a.result} />}
              </TableCell>
              <TableCell>{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "—"}</TableCell>
              <TableCell className="text-right">
                <Button variant="outline" size="sm" onClick={() => setReviewingAttempt(a)}>
                  View
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>

      <ResultReviewDialog
        open={reviewingAttempt !== null}
        onClose={() => setReviewingAttempt(null)}
        examId={reviewingAttempt?.examId ?? null}
        attemptId={reviewingAttempt?.id}
        applicantName={reviewingAttempt ? applicantName(reviewingAttempt.applicantId) : ""}
        answers={reviewingAttempt?.answers ?? {}}
        needsReview={reviewingAttempt?.needsReview}
        essayScores={reviewingAttempt?.essayScores}
      />
    </div>
  );
}
