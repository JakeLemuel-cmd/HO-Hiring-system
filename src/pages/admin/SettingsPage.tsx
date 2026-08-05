import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/common/Misc";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";

interface GeneralSettings {
  organizationName: string;
  showCorrectAnswersToApplicants: boolean;
  defaultTimezone: string;
}

const DEFAULTS: GeneralSettings = {
  organizationName: "",
  showCorrectAnswersToApplicants: false,
  defaultTimezone: "Asia/Manila",
};

export function SettingsPage() {
  const [settings, setSettings] = useState<GeneralSettings>(DEFAULTS);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    supabase
      .from("settings")
      .select("*")
      .eq("id", "general")
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setSettings({
            organizationName: data.organization_name,
            showCorrectAnswersToApplicants: data.show_correct_answers_to_applicants,
            defaultTimezone: data.default_timezone,
          });
        }
      });
  }, []);

  async function save() {
    setSaving(true);
    try {
      const { error } = await supabase
        .from("settings")
        .update({
          organization_name: settings.organizationName,
          show_correct_answers_to_applicants: settings.showCorrectAnswersToApplicants,
          default_timezone: settings.defaultTimezone,
        })
        .eq("id", "general");
      if (error) throw error;
      toast.success("Settings saved");
    } catch {
      toast.error("Unable to save settings");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="max-w-xl">
      <PageHeader title="Application Settings" description="Administrator-only system-wide settings." />
      <Card>
        <CardContent className="space-y-4 pt-6">
          <div className="space-y-1.5">
            <Label htmlFor="orgName">Organization Name</Label>
            <Input
              id="orgName"
              value={settings.organizationName}
              onChange={(e) => setSettings({ ...settings, organizationName: e.target.value })}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="tz">Default Timezone</Label>
            <Input
              id="tz"
              value={settings.defaultTimezone}
              onChange={(e) => setSettings({ ...settings, defaultTimezone: e.target.value })}
            />
          </div>
          <div className="flex items-center justify-between rounded-md border border-border p-3">
            <div>
              <p className="text-sm font-medium text-foreground">Show correct answers to applicants</p>
              <p className="text-xs text-muted-foreground">Applicants see which answers were correct after submission.</p>
            </div>
            <Switch
              checked={settings.showCorrectAnswersToApplicants}
              onCheckedChange={(checked) => setSettings({ ...settings, showCorrectAnswersToApplicants: checked })}
            />
          </div>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving..." : "Save Settings"}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
