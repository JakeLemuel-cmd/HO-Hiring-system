import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ResultReviewDialog } from "@/features/applicants/ResultReviewDialog";
import type { ExamAttemptDocument } from "@/types";

export type StatFilter = "all" | "passed" | "failed";
export type StatSort = "date" | "highest" | "lowest";

interface Row {
  attempt: ExamAttemptDocument;
  applicantName: string;
}

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

export function CategoryStatDetailDialog({
  open,
  onClose,
  categoryId,
  title,
  filter = "all",
  sort = "date",
}: {
  open: boolean;
  onClose: () => void;
  categoryId: string;
  title: string;
  filter?: StatFilter;
  sort?: StatSort;
}) {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [reviewing, setReviewing] = useState<Row | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    (async () => {
      let query = supabase.from("exam_attempts").select("*").eq("category_id", categoryId).eq("status", "completed");
      if (filter !== "all") query = query.eq("result", filter);
      const { data } = await query;
      const attempts = (data ?? []).map(mapAttempt);

      const applicantIds = Array.from(new Set(attempts.map((a) => a.applicantId)));
      const namesById = new Map<string, string>();
      if (applicantIds.length > 0) {
        const { data: applicants } = await supabase.from("applicants").select("id, first_name, last_name").in("id", applicantIds);
        (applicants ?? []).forEach((a: any) => namesById.set(a.id, `${a.first_name} ${a.last_name}`));
      }

      let mapped = attempts.map((attempt) => ({ attempt, applicantName: namesById.get(attempt.applicantId) ?? "Unknown" }));
      if (sort === "highest") mapped = mapped.sort((a, b) => (b.attempt.percentage ?? 0) - (a.attempt.percentage ?? 0));
      if (sort === "lowest") mapped = mapped.sort((a, b) => (a.attempt.percentage ?? 0) - (b.attempt.percentage ?? 0));
      if (sort === "date") mapped = mapped.sort((a, b) => (b.attempt.submittedAt ?? "").localeCompare(a.attempt.submittedAt ?? ""));

      setRows(mapped);
      setLoading(false);
    })();
  }, [open, categoryId, filter, sort]);

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
        <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
          </DialogHeader>

          {loading && <p className="text-sm text-muted-foreground">Loading...</p>}

          {!loading && rows.length === 0 && <p className="text-sm text-muted-foreground">No matching results.</p>}

          {!loading && rows.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Score</TableHead>
                  <TableHead>Result</TableHead>
                  <TableHead>Submitted</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.attempt.id}>
                    <TableCell className="font-medium text-foreground">{r.applicantName}</TableCell>
                    <TableCell>
                      {r.attempt.earnedPoints}/{r.attempt.totalPoints} ({r.attempt.percentage}%)
                    </TableCell>
                    <TableCell>
                      {r.attempt.needsReview ? (
                        <StatusBadge status="pending_review" />
                      ) : (
                        r.attempt.result && <StatusBadge status={r.attempt.result} />
                      )}
                    </TableCell>
                    <TableCell>{r.attempt.submittedAt ? new Date(r.attempt.submittedAt).toLocaleDateString() : "—"}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" onClick={() => setReviewing(r)}>
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DialogContent>
      </Dialog>

      <ResultReviewDialog
        open={reviewing !== null}
        onClose={() => setReviewing(null)}
        examId={reviewing?.attempt.examId ?? null}
        attemptId={reviewing?.attempt.id}
        applicantName={reviewing?.applicantName ?? ""}
        answers={reviewing?.attempt.answers ?? {}}
        needsReview={reviewing?.attempt.needsReview}
        essayScores={reviewing?.attempt.essayScores}
      />
    </>
  );
}
