import { adminClient, requireAdmin } from "../_shared/client.ts";
import { corsHeaders, errorResponse, jsonResponse } from "../_shared/cors.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { user, profile } = await requireAdmin(req.headers.get("Authorization"));
    const { firstName, lastName, email, role, password } = await req.json();

    if (!firstName || !lastName || !email || !role || !password) {
      return errorResponse("firstName, lastName, email, role, and password are required.");
    }
    if (role !== "admin" && role !== "talent_acquisition") {
      return errorResponse("role must be admin or talent_acquisition.");
    }
    if (typeof password !== "string" || password.length < 6) {
      return errorResponse("password must be at least 6 characters.");
    }

    const admin = adminClient();
    const { data: created, error: createError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (createError) throw createError;

    const { error: profileError } = await admin.from("profiles").insert({
      id: created.user.id,
      first_name: firstName,
      last_name: lastName,
      email,
      role,
      is_active: true,
    });
    if (profileError) throw profileError;

    await admin.from("audit_logs").insert({
      user_id: user.id,
      user_name: `${profile.first_name} ${profile.last_name}`,
      action: "staff_account_created",
      entity_type: "user",
      entity_id: created.user.id,
      description: `Created staff account for ${email} with role ${role}`,
    });

    return jsonResponse({ uid: created.user.id });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unexpected error";
    const status = message === "UNAUTHENTICATED" ? 401 : message === "PERMISSION_DENIED" ? 403 : 500;
    return errorResponse(status === 500 ? message : "Only administrators can create staff accounts.", status);
  }
});
