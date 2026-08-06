import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/common/Misc";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { subscribeToCategories } from "@/services/category.service";
import type { CategoryDocument, ExamAttemptDocument } from "@/types";
import { FolderKanban, Users, CheckCircle2, TrendingUp } from "lucide-react";
import { Link } from "react-router-dom";

function mapAttempt(row: any): ExamAttemptDocument {
  return {
    id: row.id,
    applicantId: row.applicant_id,
    categoryId: row.category_id,
    examId: row.exam_id,
    attemptNumber: row.attempt_number,
    status: row.status,
    percentage: row.percentage ?? undefined,
    result: row.result ?? undefined,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function DashboardPage() {
  const [categories, setCategories] = useState<CategoryDocument[]>([]);
  const [attempts, setAttempts] = useState<ExamAttemptDocument[]>([]);

  useEffect(() => {
    const unsub1 = subscribeToCategories(setCategories);

    async function loadAttempts() {
      const { data } = await supabase.from("exam_attempts").select("*");
      setAttempts((data ?? []).map(mapAttempt));
    }
    loadAttempts();
    const channel = supabase
      .channel("dashboard-attempts")
      .on("postgres_changes", { event: "*", schema: "public", table: "exam_attempts" }, loadAttempts)
      .subscribe();

    return () => {
      unsub1();
      supabase.removeChannel(channel);
    };
  }, []);

  const completed = attempts.filter((a) => a.status === "completed");
  const passed = completed.filter((a) => a.result === "passed");
  const totalApplicants = new Set(attempts.map((a) => a.applicantId)).size;
  const avgScore = completed.length
    ? Math.round(completed.reduce((s, a) => s + (a.percentage ?? 0), 0) / completed.length)
    : 0;
  const passRate = completed.length ? Math.round((passed.length / completed.length) * 100) : 0;

  return (
    <div>
      <PageHeader title="Dashboard" description="Overview across all hiring categories." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Hiring Categories" value={categories.length} icon={FolderKanban} />
        <StatCard label="Total Applicants" value={totalApplicants} icon={Users} />
        <StatCard label="Completed Examinations" value={completed.length} icon={CheckCircle2} />
        <StatCard label="Average Score / Pass Rate" value={`${avgScore}% / ${passRate}%`} icon={TrendingUp} />
      </div>

      <div className="mt-8">
        <h2 className="mb-3 text-sm font-semibold text-foreground">Hiring Categories</h2>
        {categories.length === 0 ? (
          <EmptyState
            title="No hiring categories yet"
            description="Create your first hiring category to start building examinations."
            action={
              <Button asChild>
                <Link to="/admin/categories/new">Create Category</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {categories.map((c) => (
              <Link key={c.id} to={`/admin/categories/${c.id}`}>
                <Card className="transition-colors hover:border-primary/50">
                  <CardContent className="p-4">
                    <p className="font-medium text-foreground">{c.name}</p>
                    <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{c.status}</p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
