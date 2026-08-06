import { useEffect, useState } from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { cn } from "@/lib/utils";
import type { ExamQuestion } from "@/types";
import { gradeEssayAnswers } from "@/services/applicant.service";
import { QUESTION_TYPE_LABELS } from "@/lib/examParts";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

function mapQuestion(row: any): ExamQuestion {
  return {
    id: row.id,
    order: row.order,
    type: row.question_type ?? "multiple_choice",
    questionText: row.question_text,
    options: row.options,
    correctOptionId: row.correct_option_id,
    correctAnswerText: row.correct_answer_text ?? "",
    points: row.points,
    explanation: row.explanation ?? undefined,
    isRequired: row.is_required,
  };
}

function isFillBlankCorrect(given: string | undefined, correct: string): boolean {
  return (given ?? "").trim().toLowerCase() === correct.trim().toLowerCase();
}

export function ResultReviewDialog({
  open,
  onClose,
  examId,
  attemptId,
  applicantName,
  answers,
  needsReview,
  essayScores,
}: {
  open: boolean;
  onClose: () => void;
  examId: string | null;
  attemptId?: string | null;
  applicantName: string;
  answers: Record<string, string>;
  needsReview?: boolean;
  essayScores?: Record<string, number>;
}) {
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [scores, setScores] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !examId) return;
    setLoading(true);
    supabase
      .from("exam_questions")
      .select("*")
      .eq("exam_id", examId)
      .order("order", { ascending: true })
      .then(({ data }) => {
        const mapped = (data ?? []).map(mapQuestion);
        setQuestions(mapped);
        const initialScores: Record<string, string> = {};
        mapped
          .filter((q) => q.type === "essay")
          .forEach((q) => {
            initialScores[q.id] = String(essayScores?.[q.id] ?? "");
          });
        setScores(initialScores);
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, examId]);

  const essayQuestions = questions.filter((q) => q.type === "essay");

  async function handleSaveScores() {
    if (!attemptId) return;
    const payload: Record<string, number> = {};
    for (const q of essayQuestions) {
      const raw = scores[q.id];
      const value = Number(raw);
      if (raw === undefined || raw === "" || Number.isNaN(value) || value < 0 || value > q.points) {
        toast.error(`Enter a score between 0 and ${q.points} for question ${q.order}.`);
        return;
      }
      payload[q.id] = value;
    }
    setSaving(true);
    try {
      await gradeEssayAnswers(attemptId, payload);
      toast.success("Essay scores saved", { description: "The applicant's result has been finalized." });
      onClose();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to save scores.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            Result Review — {applicantName}
            {needsReview && <StatusBadge status="pending_review" />}
          </DialogTitle>
        </DialogHeader>

        {loading && <p className="text-sm text-muted-foreground">Loading questions...</p>}

        <div className="space-y-4">
          {questions.map((q) => {
            const given = answers[q.id];
            const correctForFillBlank = q.type === "fill_blank" ? isFillBlankCorrect(given, q.correctAnswerText) : null;
            return (
              <div key={q.id} className="rounded-md border border-border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className="flex items-center gap-2 text-sm font-medium text-foreground">
                    Question {q.order}
                    <span className="rounded bg-muted px-1.5 py-0.5 text-xs font-normal text-muted-foreground">
                      {QUESTION_TYPE_LABELS[q.type]}
                    </span>
                  </span>
                  <span className="text-xs text-muted-foreground">{q.points} pt{q.points === 1 ? "" : "s"}</span>
                </div>
                <p className="mb-3 text-sm text-foreground">{q.questionText}</p>

                {q.type === "essay" ? (
                  <div className="space-y-2">
                    <p className="whitespace-pre-wrap rounded-md border border-border bg-muted/40 p-2 text-sm text-foreground">
                      {given || "(no response)"}
                    </p>
                    <div className="flex items-center gap-2">
                      <Label htmlFor={`score-${q.id}`} className="text-xs text-muted-foreground">
                        Score (0–{q.points})
                      </Label>
                      <Input
                        id={`score-${q.id}`}
                        type="number"
                        min={0}
                        max={q.points}
                        className="h-8 w-20"
                        value={scores[q.id] ?? ""}
                        onChange={(e) => setScores((prev) => ({ ...prev, [q.id]: e.target.value }))}
                      />
                    </div>
                  </div>
                ) : q.type === "fill_blank" ? (
                  <div className="space-y-1.5 text-sm">
                    <div
                      className={cn(
                        "flex items-center gap-2 rounded-md border p-2",
                        correctForFillBlank ? "border-success/40 bg-success/10" : "border-destructive/40 bg-destructive/10"
                      )}
                    >
                      {correctForFillBlank ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                      )}
                      <span>
                        Applicant's Answer: <strong>{given || "(no answer)"}</strong>
                      </span>
                    </div>
                    {!correctForFillBlank && (
                      <div className="flex items-center gap-2 rounded-md border border-success/40 bg-success/10 p-2">
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                        <span>
                          Correct Answer: <strong>{q.correctAnswerText}</strong>
                        </span>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-1.5">
                    {q.options.map((opt) => {
                      const isCorrect = opt.id === q.correctOptionId;
                      const isSelected = opt.id === given;
                      return (
                        <div
                          key={opt.id}
                          className={cn(
                            "flex items-center justify-between gap-2 rounded-md border p-2 text-sm",
                            isCorrect
                              ? "border-success/40 bg-success/10"
                              : isSelected
                              ? "border-destructive/40 bg-destructive/10"
                              : "border-border"
                          )}
                        >
                          <span className="flex items-center gap-2">
                            {isCorrect ? (
                              <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />
                            ) : isSelected ? (
                              <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                            ) : (
                              <span className="h-4 w-4 shrink-0" />
                            )}
                            {opt.text}
                          </span>
                          <span className="flex gap-1 text-xs">
                            {isCorrect && <span className="rounded bg-success/20 px-1.5 py-0.5 text-success">Correct</span>}
                            {isSelected && (
                              <span
                                className={cn(
                                  "rounded px-1.5 py-0.5",
                                  isCorrect ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"
                                )}
                              >
                                Applicant's Answer
                              </span>
                            )}
                          </span>
                        </div>
                      );
                    })}
                    {!given && <p className="text-xs text-muted-foreground">Applicant left this question unanswered.</p>}
                  </div>
                )}
              </div>
            );
          })}

          {!loading && questions.length === 0 && (
            <p className="text-sm text-muted-foreground">No questions found for this examination.</p>
          )}
        </div>

        {essayQuestions.length > 0 && attemptId && (
          <DialogFooter>
            <Button onClick={handleSaveScores} disabled={saving}>
              {saving ? "Saving..." : needsReview ? "Save Scores & Finalize Result" : "Update Essay Scores"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  );
}
