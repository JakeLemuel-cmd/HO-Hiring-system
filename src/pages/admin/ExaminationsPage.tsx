import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Copy, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/Misc";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { subscribeToAllExams } from "@/services/exam.service";
import type { ExamListItem } from "@/types";

function copyLink(url: string) {
  navigator.clipboard.writeText(url);
  toast.success("Link copied to clipboard");
}

export function ExaminationsPage() {
  const [exams, setExams] = useState<ExamListItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToAllExams((e) => {
      setExams(e);
      setLoading(false);
    });
    return unsub;
  }, []);

  const columns = useMemo<ColumnDef<ExamListItem>[]>(
    () => [
      {
        accessorKey: "title",
        header: "Title",
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.title}</span>,
      },
      { accessorKey: "categoryName", header: "Category" },
      {
        accessorKey: "availabilityStatus",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.availabilityStatus} />,
      },
      { accessorKey: "questionCount", header: "Questions" },
      { accessorKey: "applicantCount", header: "Applicants" },
      {
        accessorKey: "passingScore",
        header: "Passing Score",
        cell: ({ row }) => `${row.original.passingScore}%`,
      },
      {
        id: "link",
        header: "Public Link",
        cell: ({ row }) => {
          const url = row.original.publicCode ? `${window.location.origin}/exam/${row.original.publicCode}` : "";
          if (!url) return <span className="text-xs text-muted-foreground">Not published</span>;
          return (
            <div className="flex max-w-xs items-center gap-1.5">
              <span className="truncate rounded bg-muted px-2 py-1 font-mono text-xs text-primary" title={url}>
                {url}
              </span>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" onClick={() => copyLink(url)} aria-label="Copy link">
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0" asChild aria-label="Open link">
                <a href={url} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </Button>
            </div>
          );
        },
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="text-right">
            <Button variant="outline" size="sm" asChild>
              <Link to={`/admin/categories/${row.original.categoryId}/exam?exam=${row.original.id}`}>View</Link>
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader title="Examinations" description="All published examinations across hiring categories." />

      {loading ? null : exams.length === 0 ? (
        <EmptyState
          title="No examinations published yet"
          description="Publish an examination from a hiring category's Exam tab to see it here."
        />
      ) : (
        <DataTable
          columns={columns}
          data={exams}
          searchColumnId="title"
          searchPlaceholder="Search examinations..."
          emptyTitle="No examinations published yet"
          emptyDescription="Publish an examination to see it here."
        />
      )}
    </div>
  );
}
