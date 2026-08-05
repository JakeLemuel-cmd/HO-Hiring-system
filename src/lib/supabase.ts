import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

/** True when required env vars are missing — lets the UI show a setup message instead of a blank screen. */
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

// A placeholder URL keeps createClient() from throwing synchronously (which would crash the whole
// app before React can render) when .env hasn't been configured yet. Every real call still fails,
// but main.tsx checks isSupabaseConfigured first and shows setup instructions instead of a white screen.
export const supabase = createClient(supabaseUrl || "https://placeholder.supabase.co", supabaseAnonKey || "placeholder-anon-key");

/** Invokes a Supabase Edge Function and unwraps its JSON body, throwing on error responses. */
export async function invokeFunction<TResponse, TPayload = unknown>(
  name: string,
  payload?: TPayload
): Promise<TResponse> {
  const { data, error } = await supabase.functions.invoke<TResponse>(name, {
    body: payload ?? {},
  });
  if (error) {
    let message = error.message ?? "Something went wrong. Please try again.";
    const context: Response | undefined = (error as any)?.context;
    if (context && typeof context.json === "function") {
      try {
        const body = await context.clone().json();
        if (body?.error) message = body.error;
      } catch {
        // response body wasn't JSON — fall back to the generic error message
      }
    }
    throw new Error(message);
  }
  return data as TResponse;
}

export const PUBLIC_APP_URL = import.meta.env.VITE_PUBLIC_APP_URL ?? window.location.origin;
