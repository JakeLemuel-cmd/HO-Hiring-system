import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "@/layouts/AppLayout";
import { ProtectedRoute } from "@/components/common/ProtectedRoute";
import { RoleGuard } from "@/components/common/RoleGuard";

import { LoginPage } from "@/pages/auth/LoginPage";
import { ForgotPasswordPage } from "@/pages/auth/ForgotPasswordPage";

import { DashboardPage } from "@/pages/admin/DashboardPage";
import { CategoriesListPage } from "@/pages/admin/CategoriesListPage";
import { CategoryFormPage } from "@/pages/admin/CategoryFormPage";
import { CategoryDetailPage } from "@/pages/admin/CategoryDetailPage";
import { ExaminationsPage } from "@/pages/admin/ExaminationsPage";
import { UsersPage } from "@/pages/admin/UsersPage";
import { SettingsPage } from "@/pages/admin/SettingsPage";
import { AuditLogsPage } from "@/pages/admin/AuditLogsPage";
import { ApplicantsPage } from "@/pages/admin/ApplicantsPage";
import { ApplicantProfilePage } from "@/pages/admin/ApplicantProfilePage";
import { ExportPage } from "@/pages/admin/ExportPage";

import { ExamRegisterPage } from "@/pages/public/ExamRegisterPage";
import { ExamInstructionsPage } from "@/pages/public/ExamInstructionsPage";
import { ExamTakePage } from "@/pages/public/ExamTakePage";
import { ExamResultPage } from "@/pages/public/ExamResultPage";

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<LoginPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />

      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/admin/dashboard" element={<DashboardPage />} />
          <Route path="/admin/categories" element={<CategoriesListPage />} />
          <Route path="/admin/categories/new" element={<CategoryFormPage />} />
          <Route path="/admin/categories/:categoryId" element={<CategoryDetailPage />} />
          <Route path="/admin/categories/:categoryId/:tab" element={<CategoryDetailPage />} />
          <Route path="/admin/examinations" element={<ExaminationsPage />} />
          <Route path="/admin/applicants" element={<ApplicantsPage />} />
          <Route path="/admin/applicants/:applicantId" element={<ApplicantProfilePage />} />
          <Route path="/admin/export" element={<ExportPage />} />

          <Route element={<RoleGuard allow={["admin"]} />}>
            <Route path="/admin/users" element={<UsersPage />} />
            <Route path="/admin/settings" element={<SettingsPage />} />
            <Route path="/admin/audit-logs" element={<AuditLogsPage />} />
          </Route>
        </Route>
      </Route>

      <Route path="/exam/:publicCode" element={<ExamRegisterPage />} />
      <Route path="/exam/:publicCode/register" element={<ExamRegisterPage />} />
      <Route path="/exam/:publicCode/instructions" element={<ExamInstructionsPage />} />
      <Route path="/exam/:publicCode/take/:attemptId" element={<ExamTakePage />} />
      <Route path="/exam/:publicCode/result/:attemptId" element={<ExamResultPage />} />

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
