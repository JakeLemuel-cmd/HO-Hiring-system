import { useState } from "react";
import { toast } from "sonner";
import type { CategoryDocument } from "@/types";
import { updateCategory, deleteCategory } from "@/services/category.service";
import { useAuth } from "@/features/auth/AuthContext";
import { ConfirmDialog } from "@/components/common/Misc";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export function CategorySettingsTab({ category }: { category: CategoryDocument }) {
  const { profile } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    name: category.name,
    status: category.status,
  });
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  async function save() {
    if (!profile) return;
    setSaving(true);
    try {
      await updateCategory(category.id, form, profile.uid, `${profile.firstName} ${profile.lastName}`);
      toast.success("Category settings saved");
    } catch {
      toast.error("Unable to save changes");
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    await deleteCategory(category.id);
    toast.success("Category deleted");
    navigate("/admin/categories");
  }

  return (
    <Card className="max-w-xl">
      <CardContent className="space-y-4 pt-6">
        <div className="space-y-1.5">
          <Label>Category Name</Label>
          <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </div>
        <div className="space-y-1.5">
          <Label>Status</Label>
          <Select
            value={form.status}
            onValueChange={(v) => setForm({ ...form, status: v as CategoryDocument["status"] })}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Draft</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="archived">Archived</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-between pt-2">
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Button variant="outline" className="border-destructive/40 text-destructive hover:bg-destructive/10" onClick={() => setDeleteOpen(true)}>
            Delete Category
          </Button>
        </div>
      </CardContent>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete this category?"
        description="This will remove the category. Exam and applicant records are not automatically deleted."
        confirmLabel="Delete"
        danger
        onCancel={() => setDeleteOpen(false)}
        onConfirm={remove}
      />
    </Card>
  );
}
