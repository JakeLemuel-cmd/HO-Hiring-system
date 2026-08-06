import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/Misc";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { subscribeToAllAttemptResults } from "@/services/applicant.service";
import { ResultReviewDialog } from "@/features/applicants/ResultReviewDialog";
import type { AttemptResultRow } from "@/types";

export function ApplicantsPage() {
  const [rows, setRows] = useState<AttemptResultRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [reviewing, setReviewing] = useState<AttemptResultRow | null>(null);

  useEffect(() => {
    const unsub = subscribeToAllAttemptResults((r) => {
      setRows(r);
      setLoading(false);
    });
    return unsub;
  }, []);

  const columns = useMemo<ColumnDef<AttemptResultRow>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        accessorFn: (row) => row.applicantName,
        cell: ({ row }) => (
          <Link to={`/admin/applicants/${row.original.applicantId}`} className="font-medium text-primary hover:underline">
            {row.original.applicantName}
          </Link>
        ),
      },
      { accessorKey: "categoryName", header: "Category" },
      { accessorKey: "positionTitle", header: "Position" },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) =>
          row.original.needsReview ? (
            <StatusBadge status="pending_review" />
          ) : row.original.result ? (
            <StatusBadge status={row.original.result} />
          ) : (
            "—"
          ),
      },
      {
        id: "score",
        header: "Score",
        cell: ({ row }) =>
          row.original.earnedPoints != null && row.original.totalPoints != null
            ? `${row.original.earnedPoints}/${row.original.totalPoints}`
            : "—",
      },
      {
        id: "date",
        header: "Date",
        cell: ({ row }) => (row.original.submittedAt ? new Date(row.original.submittedAt).toLocaleDateString() : "—"),
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="text-right">
            <Button variant="outline" size="sm" onClick={() => setReviewing(row.original)}>
              View
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader title="Applicants" description="Every completed examination attempt across all hiring categories." />

      {loading ? null : rows.length === 0 ? (
        <EmptyState
          title="No completed examinations yet"
          description="Results will appear here once applicants complete an examination in any category."
        />
      ) : (
        <DataTable
          columns={columns}
          data={rows}
          searchColumnId="name"
          searchPlaceholder="Search applicants..."
          emptyTitle="No completed examinations yet"
          emptyDescription="Results will appear here once applicants complete an examination."
        />
      )}

      <ResultReviewDialog
        open={reviewing !== null}
        onClose={() => setReviewing(null)}
        examId={reviewing?.examId ?? null}
        attemptId={reviewing?.attemptId}
        applicantName={reviewing?.applicantName ?? ""}
        answers={reviewing?.answers ?? {}}
        needsReview={reviewing?.needsReview}
        essayScores={reviewing?.essayScores}
      />
    </div>
  );
}
