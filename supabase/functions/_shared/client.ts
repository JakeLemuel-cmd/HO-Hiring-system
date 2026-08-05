import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

/** Service-role client — bypasses RLS entirely. Only ever used inside Edge Functions,
 *  never shipped to the browser. This is the Supabase analog of the Firebase Admin SDK. */
export function adminClient() {
  return createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/** Client scoped to the caller's JWT — used to resolve "who is calling" for staff-only functions. */
export function callerClient(authHeader: string | null) {
  return createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: authHeader ?? "" } },
    auth: { autoRefreshToken: false, persistSession: false },
  });
}

export async function requireStaff(authHeader: string | null) {
  const caller = callerClient(authHeader);
  const {
    data: { user },
  } = await caller.auth.getUser();
  if (!user) throw new Error("UNAUTHENTICATED");

  const admin = adminClient();
  const { data: profile } = await admin.from("profiles").select("*").eq("id", user.id).single();
  if (!profile || !profile.is_active || (profile.role !== "admin" && profile.role !== "talent_acquisition")) {
    throw new Error("PERMISSION_DENIED");
  }
  return { user, profile };
}

export async function requireAdmin(authHeader: string | null) {
  const result = await requireStaff(authHeader);
  if (result.profile.role !== "admin") throw new Error("PERMISSION_DENIED");
  return result;
}

export function randomReferenceNumber(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function normalizeFullName(name: string): string {
  return name.trim().replace(/\s+/g, " ").toLowerCase();
}
