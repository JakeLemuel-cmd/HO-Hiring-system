export function MissingConfigScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/40 p-4">
      <div className="w-full max-w-lg rounded-lg border border-border bg-card p-8 shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">Supabase is not configured yet</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          <code className="rounded bg-muted px-1 py-0.5">VITE_SUPABASE_URL</code> and{" "}
          <code className="rounded bg-muted px-1 py-0.5">VITE_SUPABASE_ANON_KEY</code> are missing, so
          the app can't reach your Supabase project.
        </p>
        <ol className="mt-4 list-inside list-decimal space-y-1.5 text-sm text-muted-foreground">
          <li>
            Copy <code className="rounded bg-muted px-1 py-0.5">.env.example</code> to{" "}
            <code className="rounded bg-muted px-1 py-0.5">.env</code>
          </li>
          <li>
            Fill in your project URL and anon key from the{" "}
            <span className="text-foreground">Supabase Dashboard → Project Settings → API</span>
          </li>
          <li>Restart the dev server</li>
        </ol>
      </div>
    </div>
  );
}
