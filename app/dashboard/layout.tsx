/* ============================================================
 * /dashboard layout — wraps dashboard pages with auth protection
 * ============================================================ */

import { AuthProvider } from "@/lib/auth/AuthProvider";
import ProtectedRoute from "@/lib/auth/ProtectedRoute";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <AuthProvider>
      <ProtectedRoute>{children}</ProtectedRoute>
    </AuthProvider>
  );
}
