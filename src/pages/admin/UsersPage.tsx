import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase, invokeFunction } from "@/lib/supabase";
import { PageHeader } from "@/components/common/Misc";
import { StatusBadge } from "@/components/common/StatusBadge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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

export function UsersPage() {
  const [users, setUsers] = useState<UserDocument[]>([]);
  const [form, setForm] = useState({ firstName: "", lastName: "", email: "", role: "talent_acquisition" as UserRole });
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

  async function createStaff(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      await invokeFunction("create-staff-user", form);
      setForm({ firstName: "", lastName: "", email: "", role: "talent_acquisition" });
      toast.success("Staff account created", { description: `${form.email} can now reset their password to sign in.` });
    } catch (err: any) {
      toast.error("Unable to create staff account", { description: err?.message ?? "Check the details and try again." });
    } finally {
      setCreating(false);
    }
  }

  return (
    <div>
      <PageHeader title="Staff Users" description="Manage administrator and talent acquisition accounts." />

      <Card className="mb-6">
        <CardContent className="pt-6">
          <form onSubmit={createStaff} className="grid grid-cols-1 gap-3 sm:grid-cols-5 sm:items-end">
            <div className="space-y-1.5">
              <Label htmlFor="firstName">First name</Label>
              <Input
                id="firstName"
                required
                value={form.firstName}
                onChange={(e) => setForm({ ...form, firstName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="lastName">Last name</Label>
              <Input
                id="lastName"
                required
                value={form.lastName}
                onChange={(e) => setForm({ ...form, lastName: e.target.value })}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                required
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
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
            <Button disabled={creating}>{creating ? "Creating..." : "Add Staff"}</Button>
          </form>
        </CardContent>
      </Card>

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
    </div>
  );
}
