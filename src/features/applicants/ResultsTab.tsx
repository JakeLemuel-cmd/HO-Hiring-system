import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { ExamAttemptDocument } from "@/types";

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
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function ResultsTab({ categoryId, passingScore }: { categoryId: string; passingScore: number }) {
  const [attempts, setAttempts] = useState<ExamAttemptDocument[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("category_id", categoryId)
        .eq("status", "completed");
      setAttempts((data ?? []).map(mapAttempt));
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

  return (
    <div className="rounded-lg border border-border bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Reference No.</TableHead>
            <TableHead>Score</TableHead>
            <TableHead>Percentage</TableHead>
            <TableHead>Result</TableHead>
            <TableHead>Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {attempts.map((a) => (
            <TableRow key={a.id}>
              <TableCell className="font-mono text-xs">{a.resultReferenceNumber}</TableCell>
              <TableCell>{a.earnedPoints} / {a.totalPoints}</TableCell>
              <TableCell>{a.percentage}%</TableCell>
              <TableCell>{a.result && <StatusBadge status={a.result} />}</TableCell>
              <TableCell>{a.submittedAt ? new Date(a.submittedAt).toLocaleString() : "—"}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
