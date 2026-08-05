import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthContext";
import { Toaster } from "@/components/ui/sonner";
import { isSupabaseConfigured } from "@/lib/supabase";
import { MissingConfigScreen } from "@/components/common/MissingConfigScreen";
import App from "@/App";
import "@/index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    {isSupabaseConfigured ? (
      <BrowserRouter>
        <AuthProvider>
          <App />
          <Toaster position="top-right" richColors closeButton />
        </AuthProvider>
      </BrowserRouter>
    ) : (
      <MissingConfigScreen />
    )}
  </React.StrictMode>
);
