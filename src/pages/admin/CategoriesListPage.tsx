import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { ColumnDef } from "@tanstack/react-table";
import { PageHeader, ConfirmDialog } from "@/components/common/Misc";
import { EmptyState } from "@/components/common/EmptyState";
import { StatusBadge } from "@/components/common/StatusBadge";
import { DataTable } from "@/components/tables/DataTable";
import { Button } from "@/components/ui/button";
import { subscribeToCategories, deleteCategory } from "@/services/category.service";
import { useAuth } from "@/features/auth/AuthContext";
import type { CategoryDocument } from "@/types";

export function CategoriesListPage() {
  const { profile } = useAuth();
  const [categories, setCategories] = useState<CategoryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<CategoryDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsub = subscribeToCategories((c) => {
      setCategories(c);
      setLoading(false);
    });
    return unsub;
  }, []);

  async function handleDelete() {
    if (!deleteTarget || !profile) return;
    setDeleting(true);
    try {
      await deleteCategory(deleteTarget.id, deleteTarget.name, profile.uid, `${profile.firstName} ${profile.lastName}`);
      toast.success("Category deleted", { description: "Its exam sets were removed; applicant results were kept." });
      setDeleteTarget(null);
    } catch {
      toast.error("Failed to delete category.");
    } finally {
      setDeleting(false);
    }
  }

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
          <div className="flex justify-end gap-3">
            <Button variant="link" size="sm" asChild className="h-auto p-0">
              <Link to={`/admin/categories/${row.original.id}`}>Open</Link>
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive"
              onClick={() => setDeleteTarget(row.original)}
              aria-label="Delete category"
            >
              <Trash2 className="h-4 w-4" />
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

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete this category?"
        description={`This permanently deletes "${deleteTarget?.name}" and all of its exam sets. Applicant records and their exam results are kept.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        danger
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
      />
    </div>
  );
}
