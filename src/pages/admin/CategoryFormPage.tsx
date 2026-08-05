import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { categorySchema, type CategoryInput } from "@/lib/validation";
import { PageHeader } from "@/components/common/Misc";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCategory } from "@/services/category.service";
import { useAuth } from "@/features/auth/AuthContext";

export function CategoryFormPage() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CategoryInput>({
    resolver: zodResolver(categorySchema),
    defaultValues: { status: "draft", passingScore: 70, durationMinutes: 30, maximumAttempts: 1 },
  });

  async function onSubmit(values: CategoryInput) {
    if (!profile) return;
    try {
      const id = await createCategory(values, profile.uid, `${profile.firstName} ${profile.lastName}`);
      toast.success("Hiring category created");
      navigate(`/admin/categories/${id}`);
    } catch {
      toast.error("Unable to create the category. Please try again.");
    }
  }

  const field = (name: keyof CategoryInput, label: string, type = "text") => (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} type={type} {...register(name)} />
      {errors[name] && <p className="text-xs text-destructive">{errors[name]?.message as string}</p>}
    </div>
  );

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader title="Create Hiring Category" description="Define a new job position and examination settings." />
      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {field("name", "Category Name")}
            {field("positionTitle", "Position Title")}
            {field("department", "Department")}
            <div className="space-y-1.5">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" {...register("description")} rows={3} />
            </div>
            <div className="grid grid-cols-3 gap-4">
              {field("passingScore", "Passing Score (%)", "number")}
              {field("durationMinutes", "Duration (minutes)", "number")}
              {field("maximumAttempts", "Max Attempts", "number")}
            </div>
            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={watch("status")} onValueChange={(v) => setValue("status", v as CategoryInput["status"])}>
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
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Creating..." : "Create Category"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
