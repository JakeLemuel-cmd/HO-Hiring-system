import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { invokeFunction } from "@/lib/supabase";
import { saveExamAnswers, submitExamAttempt } from "@/services/applicant.service";
import type { ExamAttemptDocument, SanitizedExamQuestion } from "@/types";
import { LoadingSkeleton } from "@/components/common/LoadingSkeleton";
import { ConfirmDialog } from "@/components/common/Misc";
import { PublicExamHeader } from "@/components/common/PublicExamHeader";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

function formatTime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const pad = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export function ExamTakePage() {
  const { publicCode, attemptId } = useParams();
  const navigate = useNavigate();

  const [attempt, setAttempt] = useState<ExamAttemptDocument | null>(null);
  const [questions, setQuestions] = useState<SanitizedExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [current, setCurrent] = useState(0);
  const [remainingSeconds, setRemainingSeconds] = useState<number | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const autoSubmitted = useRef(false);

  // The attempt's server-computed expiresAt and any previously autosaved answers are fetched
  // once on load; applicants have no direct table access (RLS denies it), so this — like every
  // other applicant-facing read — goes through an Edge Function using the service role key.
  useEffect(() => {
    if (!attemptId) return;
    invokeFunction<{ attempt: ExamAttemptDocument }>("get-attempt-state", { attemptId }).then((result) => {
      setAttempt(result.attempt);
      if (result.attempt.answers) setAnswers(result.attempt.answers);
    });
  }, [attemptId]);

  // Questions are fetched through an Edge Function so applicants never receive correctOptionId —
  // RLS blocks direct reads of exam_questions for non-staff users.
  useEffect(() => {
    if (!attemptId || questions.length > 0) return;
    invokeFunction<{ questions: SanitizedExamQuestion[] }>("get-sanitized-exam-questions", { attemptId }).then(
      (result) => setQuestions(result.questions)
    );
  }, [attemptId, questions.length]);

  useEffect(() => {
    if (!attempt?.expiresAt) return;
    const expiresMs = new Date(attempt.expiresAt).getTime();
    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresMs - Date.now()) / 1000));
      setRemainingSeconds(remaining);
      if (remaining === 0 && !autoSubmitted.current) {
        autoSubmitted.current = true;
        handleSubmit(true);
      }
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [attempt?.expiresAt]);

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (!submitted) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [submitted]);

  const persistAnswers = useCallback(
    (next: Record<string, string>) => {
      if (!attemptId) return;
      saveExamAnswers(attemptId, next).catch(() => {});
    },
    [attemptId]
  );

  function selectAnswer(questionId: string, value: string) {
    const next = { ...answers, [questionId]: value };
    setAnswers(next);
    persistAnswers(next);
  }

  async function handleSubmit(isAutoSubmit = false) {
    if (!attemptId || submitted) return;
    setConfirmOpen(false);
    const result = await submitExamAttempt(attemptId, answers);
    setSubmitted(true);
    navigate(`/exam/${publicCode}/result/${result.attemptId}`, { state: { autoSubmitted: isAutoSubmit } });
  }

  if (!attempt || questions.length === 0) return <LoadingSkeleton />;

  const question = questions[current];
  const answeredCount = Object.keys(answers).length;
  const showWarning5 = remainingSeconds != null && remainingSeconds <= 300 && remainingSeconds > 60;
  const showWarning1 = remainingSeconds != null && remainingSeconds <= 60 && remainingSeconds > 0;

  return (
    <div className="min-h-screen bg-muted/40 p-3 sm:p-4">
      <div className="mx-auto max-w-3xl">
        <div className="mb-4 rounded-lg border border-border bg-card p-3 sm:p-4">
          <PublicExamHeader />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm text-muted-foreground">Question {current + 1} of {questions.length}</p>
              <p className="text-xs text-muted-foreground">{answeredCount} of {questions.length} answered</p>
            </div>
            {remainingSeconds != null && (
              <div
                aria-live="polite"
                className={cn(
                  "rounded-md px-3 py-1 text-sm font-semibold",
                  showWarning1
                    ? "bg-destructive/15 text-destructive"
                    : showWarning5
                    ? "bg-warning/15 text-warning"
                    : "bg-muted text-foreground"
                )}
              >
                Time Remaining: {formatTime(remainingSeconds)}
              </div>
            )}
          </div>
          <Progress value={(answeredCount / questions.length) * 100} className="mt-3 h-1.5" />
        </div>

        {showWarning1 && (
          <p className="mb-3 rounded-md bg-destructive/10 p-2 text-sm text-destructive" role="alert">
            You have one minute remaining. Review your answers and submit the examination.
          </p>
        )}
        {showWarning5 && !showWarning1 && (
          <p className="mb-3 rounded-md bg-warning/10 p-2 text-sm text-warning" role="status">
            You have five minutes remaining.
          </p>
        )}

        <div className="rounded-lg border border-border bg-card p-4 sm:p-6">
          <p className="mb-4 font-medium text-foreground">{question.questionText}</p>
          {question.type === "fill_blank" ? (
            <Input
              value={answers[question.id] ?? ""}
              onChange={(e) => selectAnswer(question.id, e.target.value)}
              placeholder="Type your answer"
            />
          ) : (
            <div className="space-y-2">
              {question.options.map((opt) => {
                const selected = answers[question.id] === opt.id;
                return (
                  <label
                    key={opt.id}
                    className={cn(
                      "flex cursor-pointer items-center gap-3 rounded-md border p-3 text-sm transition-colors",
                      selected ? "border-primary bg-primary/5" : "border-border hover:bg-accent"
                    )}
                  >
                    <input
                      type="radio"
                      name={question.id}
                      className="h-4 w-4 accent-primary"
                      checked={selected}
                      onChange={() => selectAnswer(question.id, opt.id)}
                    />
                    {opt.text}
                  </label>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-4 flex flex-wrap justify-center gap-1.5">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => setCurrent(i)}
              className={cn(
                "h-8 w-8 shrink-0 rounded-md text-xs font-medium transition-colors",
                answers[q.id]
                  ? "bg-success text-success-foreground"
                  : i === current
                  ? "border-2 border-primary"
                  : "border border-border text-muted-foreground"
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <Button variant="outline" disabled={current === 0} onClick={() => setCurrent((c) => c - 1)}>
            Previous
          </Button>

          {current < questions.length - 1 ? (
            <Button onClick={() => setCurrent((c) => c + 1)}>Next</Button>
          ) : (
            <Button className="bg-success text-success-foreground hover:bg-success/90" onClick={() => setConfirmOpen(true)}>
              Submit Examination
            </Button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Submit Examination?"
        description={`You have answered ${answeredCount} of ${questions.length} questions. You cannot change your answers after submitting.`}
        confirmLabel="Submit"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={() => handleSubmit(false)}
      />
    </div>
  );
}
