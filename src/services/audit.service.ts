import { supabase } from "@/lib/supabase";
import type { AuditAction } from "@/types";

export async function writeAuditLog(entry: {
  userId?: string;
  userName?: string;
  action: AuditAction;
  entityType: string;
  entityId: string;
  description: string;
  categoryId?: string;
  examId?: string;
  applicantId?: string;
  attemptId?: string;
}) {
  await supabase.from("audit_logs").insert({
    user_id: entry.userId,
    user_name: entry.userName,
    action: entry.action,
    entity_type: entry.entityType,
    entity_id: entry.entityId,
    description: entry.description,
    category_id: entry.categoryId,
    exam_id: entry.examId,
    applicant_id: entry.applicantId,
    attempt_id: entry.attemptId,
  });
}
