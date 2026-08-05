import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Breadcrumbs, PageHeader } from "@/components/common/Misc";
import { StatCard } from "@/components/common/StatCard";
import { EmptyState } from "@/components/common/EmptyState";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { subscribeToCategory, subscribeToCategoryStatistics } from "@/services/category.service";
import type { CategoryDocument, CategoryStatistics } from "@/types";
import { EMPTY_CATEGORY_STATISTICS } from "@/types";
import { ExamBuilderTab } from "@/features/exams/ExamBuilderTab";
import { ApplicantsTab } from "@/features/applicants/ApplicantsTab";
import { ResultsTab } from "@/features/applicants/ResultsTab";
import { CategorySettingsTab } from "@/features/categories/CategorySettingsTab";
import { CategoryStatDetailDialog, type StatFilter, type StatSort } from "@/features/categories/CategoryStatDetailDialog";

const TABS = ["overview", "exam", "applicants", "results", "settings"] as const;
type Tab = (typeof TABS)[number];

export function CategoryDetailPage() {
  const { categoryId, tab } = useParams();
  const navigate = useNavigate();
  const activeTab: Tab = (TABS.includes(tab as Tab) ? tab : "overview") as Tab;

  const [category, setCategory] = useState<CategoryDocument | null>(null);
  const [stats, setStats] = useState<CategoryStatistics>(EMPTY_CATEGORY_STATISTICS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!categoryId) return;
    const unsub1 = subscribeToCategory(categoryId, (c) => {
      setCategory(c);
      setLoading(false);
    });
    const unsub2 = subscribeToCategoryStatistics(categoryId, setStats);
    return () => {
      unsub1();
      unsub2();
    };
  }, [categoryId]);

  if (loading) return null;
  if (!category || !categoryId) {
    return (
      <EmptyState title="Category not found" description="This hiring category may have been deleted or archived." />
    );
  }

  return (
    <div>
      <Breadcrumbs items={[{ label: "Categories", to: "/admin/categories" }, { label: category.name }]} />
      <PageHeader title={category.name} description={category.positionTitle} />

      <Tabs value={activeTab} onValueChange={(v) => navigate(`/admin/categories/${categoryId}/${v}`)}>
        <TabsList>
          {TABS.map((t) => (
            <TabsTrigger key={t} value={t}>
              {t}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <OverviewTab category={category} stats={stats} categoryId={categoryId} />
        </TabsContent>
        <TabsContent value="exam">
          <ExamBuilderTab category={category} />
        </TabsContent>
        <TabsContent value="applicants">
          <ApplicantsTab categoryId={categoryId} />
        </TabsContent>
        <TabsContent value="results">
          <ResultsTab categoryId={categoryId} passingScore={category.passingScore} />
        </TabsContent>
        <TabsContent value="settings">
          <CategorySettingsTab category={category} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function OverviewTab({
  category,
  stats,
  categoryId,
}: {
  category: CategoryDocument;
  stats: CategoryStatistics;
  categoryId: string;
}) {
  const isEmpty = stats.totalApplicants === 0;
  const [detail, setDetail] = useState<{ title: string; filter: StatFilter; sort: StatSort } | null>(null);

  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Applicants"
          value={stats.totalApplicants}
          onClick={() => setDetail({ title: "Total Applicants", filter: "all", sort: "date" })}
        />
        <StatCard
          label="Completed Examinations"
          value={stats.completedExaminations}
          onClick={() => setDetail({ title: "Completed Examinations", filter: "all", sort: "date" })}
        />
        <StatCard
          label="Passed Applicants"
          value={stats.passedApplicants}
          onClick={() => setDetail({ title: "Passed Applicants", filter: "passed", sort: "date" })}
        />
        <StatCard
          label="Failed Applicants"
          value={stats.failedApplicants}
          onClick={() => setDetail({ title: "Failed Applicants", filter: "failed", sort: "date" })}
        />
        <StatCard
          label="Average Score"
          value={`${stats.averageScore}%`}
          onClick={() => setDetail({ title: "All Results", filter: "all", sort: "date" })}
        />
        <StatCard
          label="Highest Score"
          value={`${stats.highestScore}%`}
          onClick={() => setDetail({ title: "Highest Scores", filter: "all", sort: "highest" })}
        />
        <StatCard
          label="Lowest Score"
          value={`${stats.lowestScore}%`}
          onClick={() => setDetail({ title: "Lowest Scores", filter: "all", sort: "lowest" })}
        />
        <StatCard
          label="Pass Rate"
          value={`${stats.passRate}%`}
          onClick={() => setDetail({ title: "All Results", filter: "all", sort: "date" })}
        />
      </div>

      {isEmpty && (
        <div className="mt-6">
          <EmptyState
            title="No applicants yet"
            description={`Applicants who complete the ${category.name} examination will appear here.`}
          />
        </div>
      )}

      <CategoryStatDetailDialog
        open={detail !== null}
        onClose={() => setDetail(null)}
        categoryId={categoryId}
        title={detail?.title ?? ""}
        filter={detail?.filter}
        sort={detail?.sort}
      />
    </div>
  );
}
