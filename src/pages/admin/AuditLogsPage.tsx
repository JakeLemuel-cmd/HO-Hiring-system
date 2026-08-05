import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageHeader } from "@/components/common/Misc";
import { EmptyState } from "@/components/common/EmptyState";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { AuditLog } from "@/types";

function mapLog(row: any): AuditLog {
  return {
    id: row.id,
    userId: row.user_id ?? undefined,
    userName: row.user_name ?? undefined,
    action: row.action,
    entityType: row.entity_type,
    entityId: row.entity_id,
    description: row.description,
    categoryId: row.category_id ?? undefined,
    examId: row.exam_id ?? undefined,
    applicantId: row.applicant_id ?? undefined,
    attemptId: row.attempt_id ?? undefined,
    createdAt: row.created_at,
  };
}

export function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("audit_logs")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      setLogs((data ?? []).map(mapLog));
    }
    load();

    const channel = supabase
      .channel("audit-logs")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "audit_logs" }, load)
      .subscribe();

    return () => {
    supabase.removeChannel(channel);
  };
  }, []);

  return (
    <div>
      <PageHeader title="Audit Logs" description="Read-only record of important staff and system actions." />
      {logs.length === 0 ? (
        <EmptyState title="No audit activity yet" description="Actions taken by staff will be recorded here." />
      ) : (
        <div className="rounded-lg border border-border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>When</TableHead>
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Description</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap">{new Date(log.createdAt).toLocaleString()}</TableCell>
                  <TableCell>{log.userName ?? "System"}</TableCell>
                  <TableCell className="capitalize">{log.action.replace(/_/g, " ")}</TableCell>
                  <TableCell>{log.description}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
