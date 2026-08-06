import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link, Navigate, useLocation } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { loginSchema } from "@/lib/validation";
import type { z } from "zod";
import { useAuth } from "@/features/auth/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

type LoginInput = z.infer<typeof loginSchema>;

export function LoginPage() {
  const { login, authUser, profile } = useAuth();
  const location = useLocation();
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  if (authUser && profile) {
    const redirectTo = (location.state as any)?.from?.pathname ?? "/admin/dashboard";
    return <Navigate to={redirectTo} replace />;
  }

  async function onSubmit(values: LoginInput) {
    setError(null);
    try {
      await login(values.email, values.password);
    } catch {
      setError("Invalid email or password. Please try again.");
    }
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 via-muted/40 to-primary/5 p-4">
      <div className="pointer-events-none absolute -bottom-32 -right-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />

      <div className="relative flex w-full max-w-sm flex-col items-center">
        <Card className="w-full overflow-hidden border shadow-xl backdrop-blur-sm">
          <div className="h-1.5 w-full bg-gradient-to-r from-primary via-primary/60 to-primary" />
          <CardHeader className="items-center pb-2 text-center">
            <img src="/tablogo.png" alt="Logo" className="-mb-2 h-32 w-32 object-contain" />
            <CardTitle className="text-xl">Hire Coop</CardTitle>
            <CardDescription>Sign in to continue</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" {...register("email")} />
                {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    className="pr-10"
                    {...register("password")}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
              </div>
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <Button type="submit" disabled={isSubmitting} className="w-full">
                {isSubmitting ? "Signing in..." : "Sign In"}
              </Button>
            </form>
            <Link to="/forgot-password" className="mt-4 block text-center text-sm text-primary hover:underline">
              Forgot your password?
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
