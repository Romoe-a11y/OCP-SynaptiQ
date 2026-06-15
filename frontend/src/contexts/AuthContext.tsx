import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { LoginResponse } from "../types";

// ── Consolidated storage helpers ──
const STORAGE_KEY = "logged_user";
const TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refreshToken";

function loadUser(): LoginResponse | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function persistUser(user: LoginResponse) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  // Keep legacy keys in sync for the Axios interceptor
  if (user.accessToken) localStorage.setItem(TOKEN_KEY, user.accessToken);
  if (user.refreshToken) localStorage.setItem(REFRESH_TOKEN_KEY, user.refreshToken);
  if (user.role) localStorage.setItem("role", user.role);
  if (user.nomComplet) localStorage.setItem("user", user.nomComplet);
}

function clearPersistedUser() {
  localStorage.removeItem(STORAGE_KEY);
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem("role");
  localStorage.removeItem("user");
}

// ── Context shape ──
interface AuthContextValue {
  user: LoginResponse | null;
  isAuthenticated: boolean;
  role: "ADMIN" | "UTILISATEUR" | null;
  setUser: (user: LoginResponse) => void;
  logout: () => void;
  updateToken: (accessToken: string) => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ──
export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<LoginResponse | null>(loadUser);

  // Sync across tabs
  useEffect(() => {
    function onStorageChange(e: StorageEvent) {
      if (e.key === STORAGE_KEY) {
        setUserState(e.newValue ? JSON.parse(e.newValue) : null);
      }
    }
    window.addEventListener("storage", onStorageChange);
    return () => window.removeEventListener("storage", onStorageChange);
  }, []);

  const setUser = useCallback((u: LoginResponse) => {
    persistUser(u);
    setUserState(u);
  }, []);

  const logout = useCallback(() => {
    clearPersistedUser();
    setUserState(null);
  }, []);

  const updateToken = useCallback(
    (accessToken: string) => {
      if (!user) return;
      const updated = { ...user, accessToken };
      persistUser(updated);
      setUserState(updated);
    },
    [user],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isAuthenticated: !!user,
      role: user?.role ?? null,
      setUser,
      logout,
      updateToken,
    }),
    [user, setUser, logout, updateToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ── Hook ──
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within <AuthProvider>");
  }
  return ctx;
}
