import { lazy, Suspense } from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { LoginPage } from "./pages/LoginPage";
import { DashboardLayout } from "./components/layout/DashboardLayout";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { HomePage } from "./pages/HomePage";
import { DownloadQrPage } from "./pages/DownloadQrPage";
import { AdminOverview } from "./pages/admin/AdminOverview";
import { AttendanceAnalysis } from "./pages/admin/AttendanceAnalysis";
import { AdminBranches } from "./pages/admin/AdminBranches";
import { AdminManagers } from "./pages/admin/AdminManagers";
import { AdminStudents } from "./pages/admin/AdminStudents";
import { AdminUsers } from "./pages/admin/AdminUsers";

const ReportsPage = lazy(() =>
  import("./pages/ReportsPage").then((m) => ({ default: m.ReportsPage })),
);
import { ManagerDashboard } from "./pages/manager/ManagerDashboard";
import { ManagerScan } from "./pages/manager/ManagerScan";
import { ManagerStudents } from "./pages/manager/ManagerStudents";
import { ManagerUsers } from "./pages/manager/ManagerUsers";
import { UserDashboard } from "./pages/user/UserDashboard";
import { UserStudents } from "./pages/user/UserStudents";
import { ScanPage } from "./pages/ScanPage";
import { AttendanceEditPage } from "./pages/AttendanceEditPage";
import { StudentQrPage } from "./pages/StudentQrPage";
import { StudentProfilePage } from "./pages/StudentProfilePage";
import { useStore } from "./store/useStore";
import { useAppInit } from "./hooks/useAppInit";
import { useStoreHydrated } from "./hooks/useStoreHydrated";
import { isSupabaseConfigured } from "./lib/supabase";
import { ToastContainer } from "./components/ui/ToastContainer";
import type { UserRole } from "./types";

function isValidRole(role: unknown): role is UserRole {
  return role === "admin" || role === "manager" || role === "user";
}

const homePath: Record<UserRole, string> = {
  admin: "/admin",
  manager: "/manager",
  user: "/user",
};

function PageLoader() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-mist">Loading page…</p>
    </div>
  );
}

function ReportsRoute() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ReportsPage />
    </Suspense>
  );
}

function AuthEntry() {
  const hydrated = useStoreHydrated();
  const session = useStore((s) => s.session);
  const logout = useStore((s) => s.logout);

  if (!hydrated) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-page">
        <p className="text-mist">Loading…</p>
      </div>
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-page p-6">
        <div className="max-w-md rounded border border-morning bg-white p-6 text-left shadow-sm">
          <h1 className="text-lg font-semibold text-cerulean">Supabase not configured</h1>
          <p className="mt-2 text-sm text-mist">
            Add <code className="text-cerulean">VITE_SUPABASE_URL</code> and{" "}
            <code className="text-cerulean">VITE_SUPABASE_ANON_KEY</code> to Netlify env, then redeploy.
          </p>
        </div>
      </div>
    );
  }

  if (session && !isValidRole(session.role)) {
    void logout();
    return <LoginPage />;
  }

  if (session) return <Navigate to={homePath[session.role]} replace />;

  return <LoginPage />;
}

export default function App() {
  useAppInit();

  return (
    <BrowserRouter>
      <ToastContainer />
      <Routes>
        <Route path="/" element={<AuthEntry />} />
        <Route path="/login" element={<Navigate to="/" replace />} />

        <Route
          path="/admin"
          element={
            <ProtectedRoute role="admin">
              <DashboardLayout role="admin" />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage role="admin" />} />
          <Route path="dashboard" element={<AdminOverview />} />
          <Route path="analysis" element={<AttendanceAnalysis />} />
          <Route path="branches" element={<AdminBranches />} />
          <Route path="managers" element={<AdminManagers />} />
          <Route path="users" element={<AdminUsers />} />
          <Route path="students" element={<AdminStudents />} />
          <Route path="students/:studentId" element={<StudentProfilePage />} />
          <Route path="scan" element={<ScanPage />} />
          <Route path="attendance" element={<AttendanceEditPage />} />
          <Route path="students/:studentId/qr" element={<StudentQrPage />} />
          <Route path="reports" element={<ReportsRoute />} />
          <Route path="download-qr" element={<DownloadQrPage role="admin" />} />
        </Route>

        <Route
          path="/manager"
          element={
            <ProtectedRoute role="manager">
              <DashboardLayout role="manager" />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage role="manager" />} />
          <Route path="dashboard" element={<ManagerDashboard />} />
          <Route path="scan" element={<ManagerScan />} />
          <Route path="students" element={<ManagerStudents />} />
          <Route path="students/:studentId" element={<StudentProfilePage />} />
          <Route path="users" element={<ManagerUsers />} />
          <Route path="attendance" element={<AttendanceEditPage />} />
          <Route path="students/:studentId/qr" element={<StudentQrPage />} />
          <Route path="reports" element={<ReportsRoute />} />
          <Route path="download-qr" element={<DownloadQrPage role="manager" />} />
        </Route>

        <Route
          path="/user"
          element={
            <ProtectedRoute role="user">
              <DashboardLayout role="user" />
            </ProtectedRoute>
          }
        >
          <Route index element={<HomePage role="user" />} />
          <Route path="dashboard" element={<UserDashboard />} />
          <Route path="scan" element={<ScanPage />} />
          <Route path="students" element={<UserStudents />} />
          <Route path="students/:studentId" element={<StudentProfilePage />} />
          <Route path="students/:studentId/qr" element={<StudentQrPage />} />
          <Route path="attendance" element={<AttendanceEditPage />} />
          <Route path="reports" element={<ReportsRoute />} />
          <Route path="download-qr" element={<DownloadQrPage role="user" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
