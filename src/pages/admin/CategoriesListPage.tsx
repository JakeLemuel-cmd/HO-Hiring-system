import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus } from "lucide-react";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader } from "@/components/common/Misc";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { subscribeToCategories } from "@/services/category.service";
import type { CategoryDocument } from "@/types";

export function CategoriesListPage() {
  const [categories, setCategories] = useState<CategoryDocument[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = subscribeToCategories((c) => {
      setCategories(c);
      setLoading(false);
    });
    return unsub;
  }, []);

  const columns = useMemo<ColumnDef<CategoryDocument>[]>(
    () => [
      {
        accessorKey: "name",
        header: "Name",
        cell: ({ row }) => <span className="font-medium text-foreground">{row.original.name}</span>,
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        id: "actions",
        header: "",
        cell: ({ row }) => (
          <div className="text-right">
            <Button variant="link" size="sm" asChild className="h-auto p-0">
              <Link to={`/admin/categories/${row.original.id}`}>Open</Link>
            </Button>
          </div>
        ),
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader
        title="Hiring Categories"
        description="Manage job positions and their examinations."
        actions={
          <Button asChild>
            <Link to="/admin/categories/new">
              <Plus className="h-4 w-4" /> New Category
            </Link>
          </Button>
        }
      />

      {loading ? null : categories.length === 0 ? (
        <EmptyState
          title="No hiring categories yet"
          description="Categories you create will appear here with their own dashboard, examination, applicants, and results."
        />
      ) : (
        <DataTable
          columns={columns}
          data={categories}
          searchColumnId="name"
          searchPlaceholder="Search categories..."
          emptyTitle="No hiring categories yet"
          emptyDescription="Categories you create will appear here."
        />
      )}
    </div>
  );
}
