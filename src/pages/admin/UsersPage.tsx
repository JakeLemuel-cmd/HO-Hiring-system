import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Eye, EyeOff, Plus } from "lucide-react";
import { supabase, invokeFunction } from "@/lib/supabase";
import { PageHeader } from "@/components/common/Misc";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import type { UserDocument, UserRole } from "@/types";

function mapUser(row: any): UserDocument {
  return {
    uid: row.id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    role: row.role,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

const EMPTY_FORM = { fullName: "", email: "", password: "", confirmPassword: "", role: "talent_acquisition" as UserRole };

export function UsersPage() {
  const [users, setUsers] = useState<UserDocument[]>([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
      setUsers((data ?? []).map(mapUser));
    }
    load();

    const channel = supabase
      .channel("staff-users")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, load)
      .subscribe();

    return () => {
    supabase.removeChannel(channel);
  };
  }, []);

  function openDialog() {
    setForm(EMPTY_FORM);
    setFormError(null);
    setShowPassword(false);
    setShowConfirmPassword(false);
    setOpen(true);
  }

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setFormError(null);

    if (!form.fullName.trim()) {
      setFormError("Name is required.");
      return;
    }
    if (form.password.length < 6) {
      setFormError("Password must be at least 6 characters.");
      return;
    }
    if (form.password !== form.confirmPassword) {
      setFormError("Passwords do not match.");
      return;
    }

    const [firstName, ...rest] = form.fullName.trim().split(/\s+/);
    const lastName = rest.join(" ") || firstName;

    setCreating(true);
    try {
      await invokeFunction("create-staff-user", {
        firstName,
        lastName,
        email: form.email,
        role: form.role,
        password: form.password,
      });
      toast.success("Staff account created", { description: `${form.email} can now sign in with the password you set.` });
      setOpen(false);
      setForm(EMPTY_FORM);
    } catch (err: any) {
      setFormError(err?.message ?? "Unable to create staff account. Check the details and try again.");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Staff Users"
        description="Manage administrator and talent acquisition accounts."
        actions={
          <Button onClick={openDialog}>
            <Plus className="h-4 w-4" /> Add Staff
          </Button>
        }
      />

      <div className="rounded-lg border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users.map((u) => (
              <TableRow key={u.uid}>
                <TableCell className="font-medium text-foreground">{u.firstName} {u.lastName}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell className="capitalize">{u.role.replace("_", " ")}</TableCell>
                <TableCell>
                  <StatusBadge status={u.isActive ? "active" : "closed"} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Staff</DialogTitle>
          </DialogHeader>
          <form onSubmit={createStaff} className="space-y-4">
            {formError && (
              <Alert variant="destructive">
                <AlertDescription>{formError}</AlertDescription>
              </Alert>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="staffName">Name</Label>
              <Input
                id="staffName"
                required
                value={form.fullName}
                onChange={(e) => setForm({ ...form, fullName: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staffEmail">Email</Label>
              <Input
                id="staffEmail"
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staffPassword">Password</Label>
              <div className="relative">
                <Input
                  id="staffPassword"
                  required
                  type={showPassword ? "text" : "password"}
                  className="pr-10"
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="staffConfirmPassword">Confirm Password</Label>
              <div className="relative">
                <Input
                  id="staffConfirmPassword"
                  required
                  type={showConfirmPassword ? "text" : "password"}
                  className="pr-10"
                  value={form.confirmPassword}
                  onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  tabIndex={-1}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Role</Label>
              <Select value={form.role} onValueChange={(v) => setForm({ ...form, role: v as UserRole })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="talent_acquisition">Talent Acquisition</SelectItem>
                  <SelectItem value="admin">Administrator</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={creating}>
                {creating ? "Creating..." : "Add Staff"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
