import { supabase } from "@/lib/supabase";
import type { CategoryDocument, CategoryStatistics } from "@/types";
import { EMPTY_CATEGORY_STATISTICS } from "@/types";
import { writeAuditLog } from "@/services/audit.service";
import type { CategoryInput } from "@/lib/validation";

function mapCategory(row: any): CategoryDocument {
  return {
    id: row.id,
    name: row.name,
    positionTitle: row.position_title,
    department: row.department,
    description: row.description,
    passingScore: row.passing_score,
    durationMinutes: row.duration_minutes,
    maximumAttempts: row.maximum_attempts,
    status: row.status,
    openingDate: row.opening_date ?? undefined,
    closingDate: row.closing_date ?? undefined,
    createdBy: row.created_by,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(input: Partial<CategoryInput>) {
  return {
    ...(input.name !== undefined && { name: input.name }),
    ...(input.positionTitle !== undefined && { position_title: input.positionTitle }),
    ...(input.department !== undefined && { department: input.department }),
    ...(input.description !== undefined && { description: input.description }),
    ...(input.passingScore !== undefined && { passing_score: input.passingScore }),
    ...(input.durationMinutes !== undefined && { duration_minutes: input.durationMinutes }),
    ...(input.maximumAttempts !== undefined && { maximum_attempts: input.maximumAttempts }),
    ...(input.status !== undefined && { status: input.status }),
  };
}

export async function createCategory(input: CategoryInput, userId: string, userName: string) {
  const { data, error } = await supabase
    .from("categories")
    .insert({ ...toRow(input), created_by: userId })
    .select()
    .single();
  if (error) throw error;

  await writeAuditLog({
    userId,
    userName,
    action: "category_created",
    entityType: "category",
    entityId: data.id,
    description: `Created hiring category "${input.name}"`,
    categoryId: data.id,
  });
  return data.id as string;
}

export async function updateCategory(
  categoryId: string,
  input: Partial<CategoryInput>,
  userId: string,
  userName: string
) {
  const { error } = await supabase.from("categories").update(toRow(input)).eq("id", categoryId);
  if (error) throw error;

  await writeAuditLog({
    userId,
    userName,
    action: "category_updated",
    entityType: "category",
    entityId: categoryId,
    description: "Updated hiring category",
    categoryId,
  });
}

export async function deleteCategory(categoryId: string) {
  const { error } = await supabase.from("categories").delete().eq("id", categoryId);
  if (error) throw error;
}

export async function getCategory(categoryId: string): Promise<CategoryDocument | null> {
  const { data } = await supabase.from("categories").select("*").eq("id", categoryId).maybeSingle();
  return data ? mapCategory(data) : null;
}

export function subscribeToCategories(callback: (categories: CategoryDocument[]) => void) {
  async function load() {
    const { data } = await supabase.from("categories").select("*").order("created_at", { ascending: false });
    callback((data ?? []).map(mapCategory));
  }
  load();

  const channel = supabase
    .channel("categories-list")
    .on("postgres_changes", { event: "*", schema: "public", table: "categories" }, load)
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToCategory(categoryId: string, callback: (category: CategoryDocument | null) => void) {
  async function load() {
    const { data } = await supabase.from("categories").select("*").eq("id", categoryId).maybeSingle();
    callback(data ? mapCategory(data) : null);
  }
  load();

  const channel = supabase
    .channel(`category-${categoryId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "categories", filter: `id=eq.${categoryId}` },
      load
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

/** Computes category statistics client-side from completed attempts. Empty when no attempts exist yet. */
export function subscribeToCategoryStatistics(
  categoryId: string,
  callback: (stats: CategoryStatistics) => void
) {
  async function load() {
    const { data } = await supabase.from("exam_attempts").select("*").eq("category_id", categoryId);
    const attempts = (data ?? []) as any[];

    if (attempts.length === 0) {
      callback(EMPTY_CATEGORY_STATISTICS);
      return;
    }

    const started = attempts.filter((a) => a.status !== "not_started");
    const completed = attempts.filter((a) => a.status === "completed");
    const passed = completed.filter((a) => a.result === "passed");
    const failed = completed.filter((a) => a.result === "failed");
    const scores = completed.map((a) => a.percentage ?? 0);

    callback({
      totalApplicants: new Set(attempts.map((a) => a.applicant_id)).size,
      startedExaminations: started.length,
      completedExaminations: completed.length,
      passedApplicants: passed.length,
      failedApplicants: failed.length,
      averageScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      highestScore: scores.length ? Math.max(...scores) : 0,
      lowestScore: scores.length ? Math.min(...scores) : 0,
      passRate: completed.length ? Math.round((passed.length / completed.length) * 100) : 0,
    });
  }
  load();

  const channel = supabase
    .channel(`category-stats-${categoryId}`)
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "exam_attempts", filter: `category_id=eq.${categoryId}` },
      load
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export async function listCategoriesOnce(): Promise<CategoryDocument[]> {
  const { data } = await supabase.from("categories").select("*").order("created_at", { ascending: false });
  return (data ?? []).map(mapCategory);
}
