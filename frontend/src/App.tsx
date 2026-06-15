import { lazy, Suspense, type ReactNode } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";

import { AuthProvider } from "./contexts/AuthContext";
import { ToastProvider } from "./contexts/ToastContext";
import ErrorBoundary from "./components/common/ErrorBoundary";
import Loader from "./components/common/Loader";
import ProtectedRoute from "./routes/ProtectedRoute";

// Eager-loaded public pages
import LandingPage from "./pages/LandingPage";
import RoleSelectionPage from "./pages/RoleSelectionPage";
import NotFoundPage from "./pages/NotFoundPage";

// Lazy-loaded admin pages
const AdminDashboardPage = lazy(() => import("./pages/admin/AdminDashboardPage"));
const AdminAlertsPage = lazy(() => import("./pages/admin/AdminAlertsPage"));
const AdminAnomaliesPage = lazy(() => import("./pages/admin/AdminAnomaliesPage"));
const AdminPredictionsPage = lazy(() => import("./pages/admin/AdminPredictionsPage"));
const AdminAiDiagnosisPage = lazy(() => import("./pages/admin/AdminAiDiagnosisPage"));
const AdminActionsPage = lazy(() => import("./pages/admin/AdminActionsPage"));
const AdminThresholdsPage = lazy(() => import("./pages/admin/AdminThresholdsPage"));
const AdminExportPage = lazy(() => import("./pages/admin/AdminExportPage"));
const AdminReportPage = lazy(() => import("./pages/admin/AdminReportPage"));
const AdminUsersPage = lazy(() => import("./pages/admin/AdminUsersPage"));
const AdminSettingsPage = lazy(() => import("./pages/admin/AdminSettingsPage"));

// Lazy-loaded user pages
const UserDashboardPage = lazy(() => import("./pages/user/UserDashboardPage"));
const UserMotorsPage = lazy(() => import("./pages/user/UserMotorsPage"));
const UserAlertsPage = lazy(() => import("./pages/user/UserAlertsPage"));
const UserAnomaliesPage = lazy(() => import("./pages/user/UserAnomaliesPage"));
const UserPredictionsPage = lazy(() => import("./pages/user/UserPredictionsPage"));
const UserHistoryPage = lazy(() => import("./pages/user/UserHistoryPage"));
const UserAiDiagnosisPage = lazy(() => import("./pages/user/UserAiDiagnosisPage"));
const UserReportPage = lazy(() => import("./pages/user/UserReportPage"));

function adminRoute(element: ReactNode) {
  return <ProtectedRoute allowedRole="ADMIN">{element}</ProtectedRoute>;
}

function userRoute(element: ReactNode) {
  return <ProtectedRoute allowedRole="UTILISATEUR">{element}</ProtectedRoute>;
}

export default function App() {
  return (
    <ErrorBoundary>
      <AuthProvider>
        <ToastProvider>
          <BrowserRouter>
            <Suspense fallback={<Loader message="Loading page..." />}>
              <Routes>
                <Route path="/" element={<LandingPage />} />
                <Route path="/select-role" element={<RoleSelectionPage />} />
                <Route path="/login/admin" element={<RoleSelectionPage />} />
                <Route path="/login/user" element={<RoleSelectionPage />} />

                <Route path="/admin/dashboard" element={adminRoute(<AdminDashboardPage />)} />
                <Route path="/admin/alerts" element={adminRoute(<AdminAlertsPage />)} />
                <Route path="/admin/anomalies" element={adminRoute(<AdminAnomaliesPage />)} />
                <Route path="/admin/predictions" element={adminRoute(<AdminPredictionsPage />)} />
                <Route path="/admin/ai-diagnosis" element={adminRoute(<AdminAiDiagnosisPage />)} />
                <Route path="/admin/actions" element={adminRoute(<AdminActionsPage />)} />
                <Route path="/admin/thresholds" element={adminRoute(<AdminThresholdsPage />)} />
                <Route path="/admin/export" element={adminRoute(<AdminExportPage />)} />
                <Route path="/admin/report" element={adminRoute(<AdminReportPage />)} />
                <Route path="/admin/users" element={adminRoute(<AdminUsersPage />)} />
                <Route path="/admin/settings" element={adminRoute(<AdminSettingsPage />)} />

                <Route path="/user/dashboard" element={userRoute(<UserDashboardPage />)} />
                <Route path="/user/motors" element={userRoute(<UserMotorsPage />)} />
                <Route path="/user/alerts" element={userRoute(<UserAlertsPage />)} />
                <Route path="/user/anomalies" element={userRoute(<UserAnomaliesPage />)} />
                <Route path="/user/predictions" element={userRoute(<UserPredictionsPage />)} />
                <Route path="/user/history" element={userRoute(<UserHistoryPage />)} />
                <Route path="/user/ai-diagnosis" element={userRoute(<UserAiDiagnosisPage />)} />
                <Route path="/user/report" element={userRoute(<UserReportPage />)} />

                <Route path="*" element={<NotFoundPage />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </ToastProvider>
      </AuthProvider>
    </ErrorBoundary>
  );
}
