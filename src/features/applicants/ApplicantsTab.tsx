import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import type { ColumnDef } from "@tanstack/react-table";
import { supabase } from "@/lib/supabase";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import type { ApplicantDocument, ExamAttemptDocument } from "@/types";

interface Row {
  attempt: ExamAttemptDocument;
  applicant: ApplicantDocument | null;
}

function mapAttempt(row: any): ExamAttemptDocument {
  return {
    id: row.id,
    applicantId: row.applicant_id,
    categoryId: row.category_id,
    examId: row.exam_id,
    categoryName: row.category_name ?? undefined,
    examTitle: row.exam_title ?? undefined,
    positionTitle: row.position_title ?? undefined,
    attemptNumber: row.attempt_number,
    status: row.status,
    percentage: row.percentage ?? undefined,
    result: row.result ?? undefined,
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

export function ApplicantsTab({ categoryId }: { categoryId: string }) {
  const [rows, setRows] = useState<Row[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("exam_attempts").select("*").eq("category_id", categoryId);
      const attempts = (data ?? []).map(mapAttempt);
      const applicantIds = Array.from(new Set(attempts.map((a) => a.applicantId)));
      const applicantsById = new Map<string, ApplicantDocument>();
      if (applicantIds.length > 0) {
        const { data: applicantRows } = await supabase.from("applicants").select("*").in("id", applicantIds);
        (applicantRows ?? []).forEach((row) => applicantsById.set(row.id, mapApplicant(row)));
      }
      setRows(attempts.map((attempt) => ({ attempt, applicant: applicantsById.get(attempt.applicantId) ?? null })));
    }
    load();

    const channel = supabase
      .channel(`category-applicants-${categoryId}`)
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

  const columns = useMemo<ColumnDef<Row>[]>(
    () => [
      {
        id: "name",
        header: "Name",
        accessorFn: (row) => `${row.applicant?.firstName ?? ""} ${row.applicant?.lastName ?? ""}`,
        cell: ({ row }) =>
          row.original.applicant ? (
            <Link
              to={`/admin/applicants/${row.original.applicant.id}`}
              className="font-medium text-primary hover:underline"
            >
              {row.original.applicant.firstName} {row.original.applicant.lastName}
            </Link>
          ) : (
            <span className="font-medium text-foreground">—</span>
          ),
      },
      { id: "email", header: "Email", accessorFn: (row) => row.applicant?.email ?? "" },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.attempt.status} />,
      },
      {
        id: "score",
        header: "Score",
        cell: ({ row }) => (row.original.attempt.percentage != null ? `${row.original.attempt.percentage}%` : "—"),
      },
      {
        id: "result",
        header: "Result",
        cell: ({ row }) => (row.original.attempt.result ? <StatusBadge status={row.original.attempt.result} /> : "—"),
      },
      {
        id: "attemptNumber",
        header: "Attempt #",
        accessorFn: (row) => row.attempt.attemptNumber,
      },
    ],
    []
  );

  if (rows.length === 0) {
    return (
      <EmptyState
        title="No applicants yet"
        description="Applicants who register for this examination will appear here."
      />
    );
  }

  return (
    <div>
      <p className="mb-3 text-sm text-muted-foreground">
        {rows.length} applicant{rows.length === 1 ? "" : "s"}
      </p>
      <DataTable columns={columns} data={rows} searchColumnId="name" searchPlaceholder="Search applicants..." />
    </div>
  );
}
