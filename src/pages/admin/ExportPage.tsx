import { useEffect, useState } from "react";
import JSZip from "jszip";
import { toast } from "sonner";
import { Download } from "lucide-react";
import { supabase, PUBLIC_APP_URL } from "@/lib/supabase";
import { listCategoriesOnce } from "@/services/category.service";
import { generateResultPdf } from "@/lib/pdf";
import { computePartBreakdown } from "@/lib/examParts";
import { PageHeader } from "@/components/common/Misc";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import type { ApplicantDocument, CategoryDocument, ExamAttemptDocument } from "@/types";

function mapAttempt(row: any): ExamAttemptDocument {
  return {
    id: row.id,
    applicantId: row.applicant_id,
    categoryId: row.category_id,
    examId: row.exam_id,
    attemptNumber: row.attempt_number,
    status: row.status,
    earnedPoints: row.earned_points ?? undefined,
    totalPoints: row.total_points ?? undefined,
    percentage: row.percentage ?? undefined,
    result: row.result ?? undefined,
    resultReferenceNumber: row.result_reference_number ?? undefined,
    startedAt: row.started_at ?? undefined,
    submittedAt: row.submitted_at ?? undefined,
    needsReview: row.needs_review ?? false,
    essayScores: row.essay_scores ?? undefined,
    answers: row.answers ?? {},
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapApplicant(row: any): ApplicantDocument {
  return {
    id: row.id,
    firstName: row.first_name,
    middleName: row.middle_name ?? undefined,
    lastName: row.last_name,
    normalizedFullName: row.normalized_full_name,
    email: row.email,
    normalizedEmail: row.normalized_email,
    mobileNumber: row.mobile_number,
    applicantReferenceNumber: row.applicant_reference_number ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function ExportPage() {
  const [categories, setCategories] = useState<CategoryDocument[]>([]);
  const [categoryId, setCategoryId] = useState<string>("");
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

  useEffect(() => {
    listCategoriesOnce().then(setCategories);
  }, []);

  const category = categories.find((c) => c.id === categoryId) ?? null;

  async function handleExport() {
    if (!category) return;
    setExporting(true);
    setProgress(null);
    try {
      const { data: attemptRows } = await supabase
        .from("exam_attempts")
        .select("*")
        .eq("category_id", category.id)
        .eq("status", "completed");
      // Attempts awaiting manual essay grading have no final result yet — exclude them so the
      // export doesn't mislabel a pending result as "Failed".
      const attempts = (attemptRows ?? []).map(mapAttempt).filter((a) => !a.needsReview);

      if (attempts.length === 0) {
        toast.error("No finalized results found for this category.", {
          description: "Attempts awaiting essay grading are excluded from export.",
        });
        return;
      }

      const applicantIds = Array.from(new Set(attempts.map((a) => a.applicantId)));
      const { data: applicantRows } = await supabase.from("applicants").select("*").in("id", applicantIds);
      const applicantsById = new Map<string, ApplicantDocument>();
      (applicantRows ?? []).forEach((row) => applicantsById.set(row.id, mapApplicant(row)));

      // A category may have multiple exam sets — fetch each distinct exam's own details
      // (title/position) and questions once, and reuse them per attempt.
      const examIds = Array.from(new Set(attempts.map((a) => a.examId)));
      const [{ data: examRows }, { data: allQuestions }] = await Promise.all([
        supabase.from("exams").select("id, title, position_title").in("id", examIds),
        supabase
          .from("exam_questions")
          .select("id, exam_id, order, question_type, points, correct_option_id, correct_answer_text")
          .in("exam_id", examIds)
          .order("order", { ascending: true }),
      ]);
      const examsById = new Map<string, { title: string; positionTitle: string }>();
      (examRows ?? []).forEach((e) => examsById.set(e.id, { title: e.title, positionTitle: e.position_title }));
      const questionsByExamId = new Map<string, typeof allQuestions>();
      (allQuestions ?? []).forEach((q) => {
        const list = questionsByExamId.get(q.exam_id) ?? [];
        list.push(q);
        questionsByExamId.set(q.exam_id, list);
      });

      const zip = new JSZip();
      setProgress({ done: 0, total: attempts.length });

      for (const attempt of attempts) {
        const applicant = applicantsById.get(attempt.applicantId);
        if (!applicant) continue;

        const parts = computePartBreakdown(
          (questionsByExamId.get(attempt.examId) ?? []).map((q) => ({
            id: q.id,
            type: q.question_type,
            points: q.points,
            correctOptionId: q.correct_option_id,
            correctAnswerText: q.correct_answer_text,
          })),
          attempt.answers ?? {},
          attempt.essayScores
        );

        const examDurationSeconds =
          attempt.startedAt && attempt.submittedAt
            ? Math.round((new Date(attempt.submittedAt).getTime() - new Date(attempt.startedAt).getTime()) / 1000)
            : null;
        const examInfo = examsById.get(attempt.examId);

        const { blob, filename } = await generateResultPdf({
          applicantName: `${applicant.firstName} ${applicant.lastName}`,
          contactNumber: applicant.mobileNumber,
          email: applicant.email,
          applicantReferenceNumber: applicant.applicantReferenceNumber,
          categoryName: category.name,
          positionTitle: examInfo?.positionTitle ?? "",
          examTitle: examInfo?.title ?? category.name,
          examDate: attempt.submittedAt ? new Date(attempt.submittedAt).toLocaleDateString() : "",
          examDurationSeconds,
          rawScore: attempt.earnedPoints ?? 0,
          totalPoints: attempt.totalPoints ?? 0,
          percentage: attempt.percentage ?? 0,
          result: attempt.result ?? "failed",
          attemptNumber: attempt.attemptNumber,
          resultReferenceNumber: attempt.resultReferenceNumber ?? "",
          verificationUrl: `${PUBLIC_APP_URL}/exam/verify/${attempt.resultReferenceNumber}`,
          parts,
        });
        zip.file(filename, blob);
        setProgress((prev) => ({ done: (prev?.done ?? 0) + 1, total: attempts.length }));
      }

      const zipBlob = await zip.generateAsync({ type: "blob" });
      const zipFilename = `${category.name}.zip`;
      const url = URL.createObjectURL(zipBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = zipFilename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);

      toast.success(`Exported ${attempts.length} result${attempts.length === 1 ? "" : "s"}`, {
        description: zipFilename,
      });
    } catch {
      toast.error("Failed to export results. Please try again.");
    } finally {
      setExporting(false);
      setProgress(null);
    }
  }

  return (
    <div>
      <PageHeader title="Export Results" description="Download all applicant result PDFs for a hiring category as a ZIP file." />

      <Card className="max-w-lg">
        <CardContent className="space-y-4 pt-6">
          {categories.length === 0 ? (
            <EmptyState title="No categories yet" description="Create a hiring category before exporting results." />
          ) : (
            <>
              <div className="space-y-1.5">
                <Label>Hiring Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Button onClick={handleExport} disabled={!category || exporting} className="w-full">
                <Download className="h-4 w-4" />
                {exporting
                  ? progress
                    ? `Exporting ${progress.done}/${progress.total}...`
                    : "Preparing export..."
                  : "Export All Results (ZIP)"}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
