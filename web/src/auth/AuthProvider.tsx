import { useEffect, useMemo, useState, type ReactNode } from "react";
import { authApi } from "@/lib/api";
import type { User } from "@/lib/types";
import { AuthContext, type AuthContextValue, type AuthStatus } from "./auth-context";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [status, setStatus] = useState<AuthStatus>("loading");

  useEffect(() => {
    let mounted = true;
    const expireSession = () => {
      if (!mounted) return;
      setUser(null);
      setStatus("signed-out");
    };
    window.addEventListener("auth:expired", expireSession);

    void authApi.me().then((currentUser) => {
      if (!mounted) return;
      setUser(currentUser);
      setStatus("signed-in");
    }).catch(() => {
      if (!mounted) return;
      setUser(null);
      setStatus("signed-out");
    });

    return () => {
      mounted = false;
      window.removeEventListener("auth:expired", expireSession);
    };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user,
    status,
    async login(email, password) {
      const signedInUser = await authApi.login({ email, password });
      setUser(signedInUser);
      setStatus("signed-in");
    },
    async register(name, email, password) {
      const signedInUser = await authApi.register({ name, email, password });
      setUser(signedInUser);
      setStatus("signed-in");
    },
    async logout() {
      await authApi.logout();
      setUser(null);
      setStatus("signed-out");
    },
  }), [user, status]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
