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
          <OverviewTab category={category} stats={stats} />
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

function OverviewTab({ category, stats }: { category: CategoryDocument; stats: CategoryStatistics }) {
  const isEmpty = stats.totalApplicants === 0;
  return (
    <div>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Applicants" value={stats.totalApplicants} />
        <StatCard label="Completed Examinations" value={stats.completedExaminations} />
        <StatCard label="Passed Applicants" value={stats.passedApplicants} />
        <StatCard label="Failed Applicants" value={stats.failedApplicants} />
        <StatCard label="Average Score" value={`${stats.averageScore}%`} />
        <StatCard label="Highest Score" value={`${stats.highestScore}%`} />
        <StatCard label="Lowest Score" value={`${stats.lowestScore}%`} />
        <StatCard label="Pass Rate" value={`${stats.passRate}%`} />
      </div>

      {isEmpty && (
        <div className="mt-6">
          <EmptyState
            title="No applicants yet"
            description={`Applicants who complete the ${category.name} examination will appear here.`}
          />
        </div>
      )}
    </div>
  );
}
