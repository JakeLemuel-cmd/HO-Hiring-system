import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import type { CategoryDocument, ExamDocument } from "@/types";
import { examSetSchema } from "@/lib/validation";
import { subscribeToExamSets, createExamSet, deleteExamSet } from "@/services/exam.service";
import { useAuth } from "@/features/auth/AuthContext";
import { ExamBuilderTab } from "@/features/exams/ExamBuilderTab";
import { StatusBadge } from "@/components/common/StatusBadge";
import { EmptyState } from "@/components/common/EmptyState";
import { ConfirmDialog } from "@/components/common/Misc";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const EMPTY_FORM = {
  title: "",
  positionTitle: "",
  department: "",
  passingScore: "70",
  durationMinutes: "30",
  maximumAttempts: "1",
};

export function ExamSetsTab({ category }: { category: CategoryDocument }) {
  const { profile } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [exams, setExams] = useState<ExamDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(searchParams.get("exam"));

  const [newSetOpen, setNewSetOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<ExamDocument | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    const unsub = subscribeToExamSets(category.id, (list) => {
      setExams(list);
      setLoading(false);
    });
    return unsub;
  }, [category.id]);

  function openNewSet() {
    setFormError(null);
    setForm({ ...EMPTY_FORM, title: `${category.name} Examination — Set ${exams.length + 1}` });
    setNewSetOpen(true);
  }

  async function handleCreateSet() {
    if (!profile) return;
    const parsed = examSetSchema.safeParse(form);
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Check the fields above.");
      return;
    }
    setFormError(null);
    setCreating(true);
    try {
      const id = await createExamSet(category.id, profile.uid, parsed.data);
      setNewSetOpen(false);
      selectSet(id);
      toast.success("Exam set created");
    } catch {
      toast.error("Failed to create exam set.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDeleteSet() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteExamSet(deleteTarget.id);
      setDeleteTarget(null);
      toast.success("Exam set deleted");
    } catch {
      toast.error("Failed to delete exam set.");
    } finally {
      setDeleting(false);
    }
  }

  function selectSet(id: string | null) {
    setSelectedId(id);
    setSearchParams(id ? { exam: id } : {}, { replace: true });
  }

  if (loading) return null;

  const selectedExam = exams.find((e) => e.id === selectedId) ?? null;
  if (selectedExam) {
    return <ExamBuilderTab category={category} examId={selectedExam.id} onBack={() => selectSet(null)} />;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          A category can hold multiple exam sets, each for a different role (e.g. Software Engineer, QA
          Analyst) — each is built, published, and linked independently.
        </p>
        <Button size="sm" onClick={openNewSet}>
          <Plus className="h-4 w-4" /> New Exam Set
        </Button>
      </div>

      {exams.length === 0 ? (
        <EmptyState
          title="No exam sets yet"
          description="Create your first exam set to start building questions for this category."
          action={
            <Button size="sm" onClick={openNewSet}>
              <Plus className="h-4 w-4" /> New Exam Set
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {exams.map((exam) => (
            <Card key={exam.id} className="cursor-pointer transition-colors hover:bg-accent/50" onClick={() => selectSet(exam.id)}>
              <CardContent className="flex items-center justify-between p-4">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{exam.title}</p>
                  <p className="text-sm text-muted-foreground">
                    {exam.positionTitle}
                    {exam.department && ` · ${exam.department}`}
                  </p>
                  <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <StatusBadge status={exam.availabilityStatus} />
                    <span>{exam.questionCount} question{exam.questionCount === 1 ? "" : "s"}</span>
                    <span>Passing Score: {exam.passingScore}%</span>
                  </div>
                </div>
                {exam.availabilityStatus === "draft" && exam.questionCount === 0 && (
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-destructive hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteTarget(exam);
                    }}
                    aria-label="Delete exam set"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={newSetOpen} onOpenChange={setNewSetOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Exam Set</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label htmlFor="setTitle">Title</Label>
              <Input id="setTitle" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="setPosition">Position Title</Label>
                <Input
                  id="setPosition"
                  value={form.positionTitle}
                  onChange={(e) => setForm({ ...form, positionTitle: e.target.value })}
                  placeholder="e.g. Software Engineer"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setDepartment">Department</Label>
                <Input
                  id="setDepartment"
                  value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="e.g. IT"
                />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label htmlFor="setPassingScore">Passing Score (%)</Label>
                <Input
                  id="setPassingScore"
                  type="number"
                  min={0}
                  max={100}
                  value={form.passingScore}
                  onChange={(e) => setForm({ ...form, passingScore: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setDuration">Duration (minutes)</Label>
                <Input
                  id="setDuration"
                  type="number"
                  min={1}
                  value={form.durationMinutes}
                  onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="setMaxAttempts">Max Attempts</Label>
                <Input
                  id="setMaxAttempts"
                  type="number"
                  min={1}
                  value={form.maximumAttempts}
                  onChange={(e) => setForm({ ...form, maximumAttempts: e.target.value })}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewSetOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateSet} disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={deleteTarget !== null}
        title="Delete Exam Set?"
        description={`This permanently deletes "${deleteTarget?.title}". This cannot be undone.`}
        confirmLabel={deleting ? "Deleting..." : "Delete"}
        onCancel={() => setDeleteTarget(null)}
        onConfirm={handleDeleteSet}
      />
    </div>
  );
}
