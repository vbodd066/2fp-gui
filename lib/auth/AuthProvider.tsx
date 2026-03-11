/* ============================================================
 * Auth context — session-aware React context for gating
 * ============================================================
 * Provides:
 *   - isAuthenticated: boolean
 *   - isLoading: boolean
 *   - user: authenticated user info (or null)
 *   - signOut: () => void
 *
 * Session is checked via GET /api/auth/session on mount.
 * The session endpoint now returns full user profile data.
 * Wrap protected layouts/pages with <AuthProvider>.
 * ============================================================ */

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

/* -------------------- types -------------------- */

export type AuthUser = {
  id: string;
  email: string;
  name: string;
  organization: string;
  plan: string;
  role: "admin" | "user";
};

type AuthState = {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: AuthUser | null;
  signOut: () => Promise<void>;
};

/* -------------------- context -------------------- */

const AuthContext = createContext<AuthState>({
  isAuthenticated: false,
  isLoading: true,
  user: null,
  signOut: async () => {},
});

export function useAuth() {
  return useContext(AuthContext);
}

/* -------------------- provider -------------------- */

export function AuthProvider({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<AuthUser | null>(null);
  const router = useRouter();

  useEffect(() => {
    let cancelled = false;

    async function checkSession() {
      try {
        const res = await fetch("/api/auth/session");
        const data = await res.json();
        if (!cancelled) {
          setIsAuthenticated(data.authenticated === true);
          setUser(data.user ?? null);
        }
      } catch {
        if (!cancelled) {
          setIsAuthenticated(false);
          setUser(null);
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    }

    checkSession();
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = useCallback(async () => {
    try {
      await fetch("/api/auth/signout", { method: "POST" });
    } catch {
      /* ignore */
    }
    setIsAuthenticated(false);
    setUser(null);
    router.push("/auth/signin");
  }, [router]);

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
