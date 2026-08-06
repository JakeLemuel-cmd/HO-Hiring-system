import { useEffect, useRef, useState } from "react";
import { Trash2, GripVertical, Copy, ExternalLink, Download, Sparkles, Plus, Pencil } from "lucide-react";
import QRCode from "qrcode";
import { toast } from "sonner";
import type { CategoryDocument, ExamDocument, ExamQuestion, QuestionType } from "@/types";
import { examBuilderSetupSchema } from "@/lib/validation";
import {
  ensureExamDraft,
  subscribeToExam,
  subscribeToQuestions,
  saveQuestion,
  deleteQuestion,
  updateExamTitle,
  regenerateQuestions,
  appendQuestions,
  publishExam,
  closeExam,
  reopenExam,
} from "@/services/exam.service";
import { useAuth } from "@/features/auth/AuthContext";
import { StatusBadge } from "@/components/common/StatusBadge";
import { ConfirmDialog } from "@/components/common/Misc";
import { downloadBlob } from "@/lib/pdf";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Multiple Choice",
  true_false: "True or False",
  fill_blank: "Fill in the Blank",
};

function newQuestion(order: number, type: QuestionType): ExamQuestion {
  if (type === "true_false") {
    return {
      id: crypto.randomUUID(),
      order,
      type,
      questionText: "",
      options: [
        { id: "true", text: "True" },
        { id: "false", text: "False" },
      ],
      correctOptionId: "true",
      correctAnswerText: "",
      points: 1,
      isRequired: true,
    };
  }
  if (type === "fill_blank") {
    return {
      id: crypto.randomUUID(),
      order,
      type,
      questionText: "",
      options: [],
      correctOptionId: "",
      correctAnswerText: "",
      points: 1,
      isRequired: true,
    };
  }
  const optionIds = ["a", "b", "c", "d"].map((s) => `${s}-${crypto.randomUUID().slice(0, 6)}`);
  return {
    id: crypto.randomUUID(),
    order,
    type: "multiple_choice",
    questionText: "",
    options: optionIds.map((id) => ({ id, text: "" })),
    correctOptionId: optionIds[0],
    correctAnswerText: "",
    points: 1,
    isRequired: true,
  };
}

export function ExamBuilderTab({ category }: { category: CategoryDocument }) {
  const { profile } = useAuth();
  const [examId, setExamId] = useState<string | null>(null);
  const [exam, setExam] = useState<ExamDocument | null>(null);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [publishError, setPublishError] = useState<string | null>(null);
  const [closeDialogOpen, setCloseDialogOpen] = useState(false);
  const [closeReason, setCloseReason] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);

  const [builderTitle, setBuilderTitle] = useState("");
  const [builderType, setBuilderType] = useState<QuestionType>("multiple_choice");
  const [builderCount, setBuilderCount] = useState("10");
  const [builderError, setBuilderError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [lastBatch, setLastBatch] = useState<{ type: QuestionType; count: number } | null>(null);

  const [addMoreOpen, setAddMoreOpen] = useState(false);
  const [addMoreType, setAddMoreType] = useState<QuestionType>("multiple_choice");
  const [addMoreCount, setAddMoreCount] = useState("10");
  const [addMoreError, setAddMoreError] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  const [editMode, setEditMode] = useState(false);

  useEffect(() => {
    if (!profile) return;
    ensureExamDraft(category.id, category.name, profile.uid).then(setExamId);
  }, [category.id, category.name, profile]);

  useEffect(() => {
    if (!examId) return;
    const unsub1 = subscribeToExam(examId, setExam);
    const unsub2 = subscribeToQuestions(examId, setQuestions);
    return () => {
      unsub1();
      unsub2();
    };
  }, [examId]);

  // Rebuilt from the current domain rather than the stored public_url, which may have been
  // saved under an old/misconfigured VITE_PUBLIC_APP_URL and would otherwise stay stale forever.
  const displayUrl = exam?.publicCode ? `${window.location.origin}/exam/${exam.publicCode}` : "";

  useEffect(() => {
    if (displayUrl) {
      QRCode.toDataURL(displayUrl, { margin: 1, width: 180 }).then(setQrDataUrl);
    }
  }, [displayUrl]);

  useEffect(() => {
    if (exam) setBuilderTitle(exam.title);
  }, [exam?.id]);

  useEffect(() => {
    if (lastBatch || questions.length === 0) return;
    setLastBatch({ type: questions[0].type, count: questions.length });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [questions.length]);

  if (!examId || !exam) return null;

  const isOpenForEditing = exam.availabilityStatus === "draft";
  const hasQuestions = questions.length > 0;
  const canEditFields = isOpenForEditing || editMode;
  const showQuestionsCard = isOpenForEditing || editMode;

  async function updateQuestion(q: ExamQuestion) {
    setQuestions((prev) => prev.map((existing) => (existing.id === q.id ? q : existing)));
    await saveQuestion(examId!, q);
  }

  async function removeQuestion(id: string) {
    await deleteQuestion(id);
  }

  async function handleGenerate() {
    setBuilderError(null);
    const parsed = examBuilderSetupSchema.safeParse({
      title: builderTitle,
      questionType: builderType,
      numberOfQuestions: builderCount,
    });
    if (!parsed.success) {
      setBuilderError(parsed.error.issues[0]?.message ?? "Check the exam setup fields.");
      return;
    }
    setGenerating(true);
    try {
      if (parsed.data.title !== exam!.title) {
        await updateExamTitle(examId!, parsed.data.title);
      }
      const generated = Array.from({ length: parsed.data.numberOfQuestions }, (_, i) =>
        newQuestion(i + 1, parsed.data.questionType)
      );
      const saved = await regenerateQuestions(examId!, generated);
      setQuestions(saved);
      setLastBatch({ type: parsed.data.questionType, count: parsed.data.numberOfQuestions });
      toast.success(`Generated ${parsed.data.numberOfQuestions} question field${parsed.data.numberOfQuestions === 1 ? "" : "s"}`, {
        description: `Type: ${QUESTION_TYPE_LABELS[parsed.data.questionType]}`,
      });
    } catch (err) {
      setBuilderError(err instanceof Error ? err.message : "Failed to generate questions.");
    } finally {
      setGenerating(false);
    }
  }

  function openAddMore() {
    setAddMoreError(null);
    setAddMoreType(lastBatch?.type ?? "multiple_choice");
    setAddMoreCount(String(lastBatch?.count ?? 10));
    setAddMoreOpen(true);
  }

  async function handleSaveAddMore() {
    setAddMoreError(null);
    const parsed = examBuilderSetupSchema
      .pick({ questionType: true, numberOfQuestions: true })
      .safeParse({ questionType: addMoreType, numberOfQuestions: addMoreCount });
    if (!parsed.success) {
      setAddMoreError(parsed.error.issues[0]?.message ?? "Check the fields above.");
      return;
    }
    setAdding(true);
    try {
      const startOrder = questions.length + 1;
      const generated = Array.from({ length: parsed.data.numberOfQuestions }, (_, i) =>
        newQuestion(startOrder + i, parsed.data.questionType)
      );
      const saved = await appendQuestions(examId!, generated);
      setQuestions((prev) => [...prev, ...saved]);
      setLastBatch({ type: parsed.data.questionType, count: parsed.data.numberOfQuestions });
      setAddMoreOpen(false);
      toast.success(`Added questions ${startOrder}–${startOrder + parsed.data.numberOfQuestions - 1}`, {
        description: `Type: ${QUESTION_TYPE_LABELS[parsed.data.questionType]}`,
      });
    } catch (err) {
      setAddMoreError(err instanceof Error ? err.message : "Failed to add more questions.");
    } finally {
      setAdding(false);
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      await regenerateQuestions(examId!, []);
      setQuestions([]);
      setLastBatch(null);
      setBuilderCount("10");
      setBuilderType("multiple_choice");
      setResetDialogOpen(false);
      toast.success("Exam data reset", { description: "All questions have been removed." });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to reset the exam.");
    } finally {
      setResetting(false);
    }
  }

  async function handlePublish() {
    setPublishError(null);
    if (questions.length === 0) {
      setPublishError("Generate at least one question before publishing.");
      return;
    }
    for (const q of questions) {
      if (!q.questionText.trim()) {
        setPublishError(`Question ${q.order} is missing question text.`);
        return;
      }
      if (q.type === "fill_blank") {
        if (!q.correctAnswerText.trim()) {
          setPublishError(`Question ${q.order} needs a correct answer entered.`);
          return;
        }
        continue;
      }
      if (q.options.length < 2 || q.options.some((o) => !o.text.trim())) {
        setPublishError(`Question ${q.order} needs at least two non-empty answer options.`);
        return;
      }
      if (!q.options.some((o) => o.id === q.correctOptionId)) {
        setPublishError(`Question ${q.order} needs a correct answer selected.`);
        return;
      }
    }
    if (!profile) return;
    await publishExam(category.id, examId!, category.name, questions, profile.uid, `${profile.firstName} ${profile.lastName}`);
    toast.success("Examination published", { description: "The public examination link is now live." });
  }

  async function handleClose() {
    if (!profile) return;
    await closeExam(category.id, examId!, closeReason || undefined, profile.uid, `${profile.firstName} ${profile.lastName}`);
    setCloseDialogOpen(false);
    setCloseReason("");
    toast.success("Examination closed", { description: "New applicants can no longer register." });
  }

  async function handleReopen() {
    if (!profile) return;
    await reopenExam(category.id, examId!, profile.uid, `${profile.firstName} ${profile.lastName}`);
    toast.success("Examination reopened", { description: "The public link is accepting applicants again." });
  }

  function copyLink() {
    if (displayUrl) {
      navigator.clipboard.writeText(displayUrl);
      toast.success("Link copied to clipboard");
    }
  }

  function downloadQr() {
    if (!qrDataUrl || !exam) return;
    fetch(qrDataUrl)
      .then((r) => r.blob())
      .then((blob) => downloadBlob(blob, `${exam.publicCode}-qrcode.png`));
  }

  return (
    <div className="space-y-6">
      {displayUrl && (
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-semibold text-foreground">{exam.title}</h3>
                <p className="text-sm text-muted-foreground">
                  {category.name} · {category.positionTitle}
                </p>
                <p className="mt-2 break-all rounded-md bg-muted px-2 py-1 font-mono text-sm text-primary">
                  {displayUrl}
                </p>
                <div className="mt-3 flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1.5">
                    Status: <StatusBadge status={exam.availabilityStatus} />
                  </span>
                  <span>Time Limit: {exam.hasTimeLimit ? `${exam.durationMinutes} minutes` : "No limit"}</span>
                  <span>Questions: {exam.questionCount}</span>
                  <span>Passing Score: {exam.passingScore}%</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button variant="outline" size="sm" onClick={copyLink}>
                    <Copy className="h-4 w-4" /> Copy Link
                  </Button>
                  <Button variant="outline" size="sm" asChild>
                    <a href={displayUrl} target="_blank" rel="noreferrer">
                      <ExternalLink className="h-4 w-4" /> Open Link
                    </a>
                  </Button>
                  {qrDataUrl && (
                    <Button variant="outline" size="sm" onClick={downloadQr}>
                      <Download className="h-4 w-4" /> Download QR Code
                    </Button>
                  )}
                  {!isOpenForEditing && (
                    <Button variant="outline" size="sm" onClick={() => setEditMode((v) => !v)}>
                      <Pencil className="h-4 w-4" /> {editMode ? "Done Editing" : "Edit Exam"}
                    </Button>
                  )}
                  {exam.availabilityStatus === "open" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-destructive/40 text-destructive hover:bg-destructive/10"
                      onClick={() => setCloseDialogOpen(true)}
                    >
                      Close Examination
                    </Button>
                  )}
                  {(exam.availabilityStatus === "closed" || exam.availabilityStatus === "expired") && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="border-success/40 text-success hover:bg-success/10"
                      onClick={handleReopen}
                    >
                      Reopen Examination
                    </Button>
                  )}
                </div>
              </div>
              {qrDataUrl && (
                <img src={qrDataUrl} alt="Examination QR code" className="h-32 w-32 rounded-md border border-border" />
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {canEditFields && (
        <Card>
          <CardContent className="space-y-4 pt-6">
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-foreground">Exam Builder</h3>
              {hasQuestions && (
                <Button
                  variant="outline"
                  size="sm"
                  className="border-destructive/40 text-destructive hover:bg-destructive/10"
                  onClick={() => setResetDialogOpen(true)}
                >
                  Reset Exam
                </Button>
              )}
            </div>

            {builderError && (
              <Alert variant="destructive">
                <AlertDescription>{builderError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="examTitle">Exam Title</Label>
              <Input
                id="examTitle"
                value={builderTitle}
                onChange={(e) => setBuilderTitle(e.target.value)}
                onBlur={() => {
                  if (hasQuestions && builderTitle.trim() && builderTitle !== exam!.title) {
                    updateExamTitle(examId!, builderTitle.trim()).catch(() => {});
                  }
                }}
                placeholder="e.g. IT Support Screening Exam"
              />
            </div>

            {!hasQuestions ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Choose the question type and set the number of questions — the form generates that many question
                  fields, each with its own correct answer.
                </p>
                <div className="grid gap-4 sm:grid-cols-3">
                  <div className="space-y-1.5">
                    <Label>Question Type</Label>
                    <Select value={builderType} onValueChange={(v) => setBuilderType(v as QuestionType)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                        <SelectItem value="true_false">True or False</SelectItem>
                        <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="questionCount">Number of Questions</Label>
                    <Input
                      id="questionCount"
                      type="number"
                      min={1}
                      max={100}
                      value={builderCount}
                      onChange={(e) => setBuilderCount(e.target.value)}
                    />
                  </div>
                  <div className="flex items-end">
                    <Button onClick={handleGenerate} disabled={generating} className="w-full">
                      <Sparkles className="h-4 w-4" /> Generate Questions
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex items-center justify-between rounded-md border border-dashed border-border p-3">
                <p className="text-sm text-muted-foreground">
                  {questions.length} question{questions.length === 1 ? "" : "s"} generated. Add another batch to
                  continue numbering from Question {questions.length + 1}.
                </p>
                <Button variant="outline" size="sm" onClick={openAddMore}>
                  <Plus className="h-4 w-4" /> Add More Questions
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {showQuestionsCard && (
        <Card>
          <CardContent className="pt-6">
            {publishError && (
              <Alert variant="destructive" className="mb-3">
                <AlertDescription>{publishError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-4">
              {questions.map((q) => (
                <QuestionEditor
                  key={q.id}
                  question={q}
                  disabled={!canEditFields}
                  onChange={updateQuestion}
                  onDelete={() => removeQuestion(q.id)}
                />
              ))}
            </div>

            {isOpenForEditing && questions.length > 0 && (
              <Button
                onClick={handlePublish}
                className="mt-4 bg-success text-success-foreground hover:bg-success/90"
              >
                Publish Examination
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      <ConfirmDialog
        open={closeDialogOpen}
        title="Close Examination?"
        description="New applicants will not be able to start this examination. Applicants who already submitted their answers will not be affected."
        confirmLabel="Close Examination"
        danger
        onCancel={() => setCloseDialogOpen(false)}
        onConfirm={handleClose}
      >
        <div className="space-y-1.5">
          <Label htmlFor="closeReason">Reason, optional</Label>
          <Textarea id="closeReason" value={closeReason} onChange={(e) => setCloseReason(e.target.value)} rows={2} />
        </div>
      </ConfirmDialog>

      <ConfirmDialog
        open={resetDialogOpen}
        title="Reset Examination?"
        description="This will permanently delete all generated questions for this examination. This cannot be undone."
        confirmLabel={resetting ? "Resetting..." : "Reset Exam"}
        danger
        onCancel={() => setResetDialogOpen(false)}
        onConfirm={handleReset}
      />

      <Dialog open={addMoreOpen} onOpenChange={setAddMoreOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add More Questions</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {addMoreError && (
              <Alert variant="destructive">
                <AlertDescription>{addMoreError}</AlertDescription>
              </Alert>
            )}
            <div className="space-y-1.5">
              <Label>Question Type</Label>
              <Select value={addMoreType} onValueChange={(v) => setAddMoreType(v as QuestionType)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                  <SelectItem value="true_false">True or False</SelectItem>
                  <SelectItem value="fill_blank">Fill in the Blank</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="addMoreCount">Number of Questions</Label>
              <Input
                id="addMoreCount"
                type="number"
                min={1}
                max={100}
                value={addMoreCount}
                onChange={(e) => setAddMoreCount(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddMoreOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveAddMore} disabled={adding}>
              {adding ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

const OPTION_LETTERS = ["A", "B", "C", "D", "E", "F"];

function QuestionEditor({
  question,
  disabled,
  onChange,
  onDelete,
}: {
  question: ExamQuestion;
  disabled: boolean;
  onChange: (q: ExamQuestion) => void;
  onDelete: () => void;
}) {
  const [local, setLocal] = useState(question);
  const pendingRef = useRef<ExamQuestion | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Only resync from the server copy when a different question loads in — not on every
  // realtime reload — otherwise an in-flight keystroke can be overwritten by a stale fetch.
  useEffect(() => {
    setLocal(question);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question.id]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (pendingRef.current) onChange(pendingRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function commit(next: ExamQuestion) {
    setLocal(next);
    pendingRef.current = next;
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      if (pendingRef.current) {
        onChange(pendingRef.current);
        pendingRef.current = null;
      }
    }, 500);
  }

  function flush() {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (pendingRef.current) {
      onChange(pendingRef.current);
      pendingRef.current = null;
    }
  }

  return (
    <div className="rounded-md border border-border p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="flex items-center gap-2 text-sm font-medium text-foreground">
          <GripVertical className="h-4 w-4 text-muted-foreground" /> Question {local.order}
          <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
            {QUESTION_TYPE_LABELS[local.type]}
          </span>
        </span>
        {!disabled && (
          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={onDelete}>
            <Trash2 className="h-4 w-4" />
          </Button>
        )}
      </div>
      <Textarea
        disabled={disabled}
        value={local.questionText}
        onChange={(e) => commit({ ...local, questionText: e.target.value })}
        onBlur={flush}
        placeholder="Enter question text"
        rows={2}
      />

      {local.type === "fill_blank" ? (
        <div className="mt-3 space-y-1.5">
          <Label htmlFor={`answer-${local.id}`} className="text-xs text-muted-foreground">
            Correct Answer
          </Label>
          <Input
            id={`answer-${local.id}`}
            disabled={disabled}
            value={local.correctAnswerText}
            onChange={(e) => commit({ ...local, correctAnswerText: e.target.value })}
            onBlur={flush}
            placeholder="Enter the correct word or phrase"
            className="h-8"
          />
        </div>
      ) : local.type === "true_false" ? (
        <div className="mt-3 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Correct Answer</Label>
          <RadioGroup
            className="flex items-center gap-6"
            value={local.correctOptionId}
            onValueChange={(id) => {
              commit({ ...local, correctOptionId: id });
              flush();
            }}
          >
            {local.options.map((opt) => (
              <label key={opt.id} htmlFor={`${local.id}-${opt.id}`} className="flex items-center gap-2 text-sm">
                <RadioGroupItem value={opt.id} id={`${local.id}-${opt.id}`} disabled={disabled} />
                {opt.text}
              </label>
            ))}
          </RadioGroup>
        </div>
      ) : (
        <div className="mt-3 space-y-1.5">
          <Label className="text-xs text-muted-foreground">Options — select the correct answer</Label>
          <RadioGroup
            value={local.correctOptionId}
            onValueChange={(id) => {
              commit({ ...local, correctOptionId: id });
              flush();
            }}
          >
            {local.options.map((opt, idx) => (
              <div key={opt.id} className="flex items-center gap-2">
                <RadioGroupItem value={opt.id} id={`${local.id}-${opt.id}`} disabled={disabled} />
                <span className="w-5 shrink-0 text-sm font-medium text-muted-foreground">
                  {OPTION_LETTERS[idx] ?? idx + 1}.
                </span>
                <Input
                  disabled={disabled}
                  value={opt.text}
                  onChange={(e) => {
                    const options = [...local.options];
                    options[idx] = { ...opt, text: e.target.value };
                    commit({ ...local, options });
                  }}
                  onBlur={flush}
                  placeholder={`Option ${OPTION_LETTERS[idx] ?? idx + 1}`}
                  className="h-8 flex-1"
                />
              </div>
            ))}
          </RadioGroup>
        </div>
      )}
      <div className="mt-3 flex items-center gap-3">
        <Label htmlFor={`points-${local.id}`} className="text-xs text-muted-foreground">
          Points
        </Label>
        <Input
          id={`points-${local.id}`}
          type="number"
          min={1}
          disabled={disabled}
          value={local.points}
          onChange={(e) => commit({ ...local, points: Number(e.target.value) })}
          onBlur={flush}
          className="h-8 w-20"
        />
      </div>
    </div>
  );
}
