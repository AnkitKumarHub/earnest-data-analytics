import { Navigate, Outlet, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/auth/auth-context";
import { Spinner } from "@/components/ui/spinner";
import { AuthPage } from "@/pages/AuthPage";
import { DashboardPage } from "@/pages/DashboardPage";

function RouteLoading() {
  return (
    <main className="flex min-h-[100dvh] items-center justify-center gap-3 text-sm text-muted-foreground" aria-label="Loading your workspace">
      <Spinner label="Loading your workspace" />
      Loading your workspace…
    </main>
  );
}

function ProtectedRoute() {
  const { status } = useAuth();
  const location = useLocation();
  if (status === "loading") return <RouteLoading />;
  if (status === "signed-out") return <Navigate to="/login" replace state={{ from: location.pathname + location.search }} />;
  return <Outlet />;
}

function PublicOnlyRoute() {
  const { status } = useAuth();
  if (status === "loading") return <RouteLoading />;
  if (status === "signed-in") return <Navigate to="/tasks" replace />;
  return <Outlet />;
}

export function AppRoutes() {
  const { status } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to={status === "signed-in" ? "/tasks" : "/login"} replace />} />
      <Route element={<PublicOnlyRoute />}>
        <Route path="/login" element={<AuthPage mode="login" />} />
        <Route path="/register" element={<AuthPage mode="register" />} />
      </Route>
      <Route element={<ProtectedRoute />}>
        <Route path="/tasks" element={<DashboardPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
