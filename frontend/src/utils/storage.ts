import type { LoginResponse } from "../types";

const USER_KEY = "logged_user";

export function saveUser(user: LoginResponse) {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  // Keep legacy keys in sync for the Axios interceptor
  if (user.accessToken) localStorage.setItem("token", user.accessToken);
  if (user.refreshToken) localStorage.setItem("refreshToken", user.refreshToken);
  if (user.role) localStorage.setItem("role", user.role);
  if (user.nomComplet) localStorage.setItem("user", user.nomComplet);
}

export function getUser(): LoginResponse | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function removeUser() {
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("role");
  localStorage.removeItem("user");
}
