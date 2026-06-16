import api from "./api";
import type {
  LoginRequest,
  LoginResponse,
  PasswordChangeRequest,
  ProfileDetails,
  ProfileUpdateRequest,
} from "../types";

/**
 * Authenticate against the backend.
 * The caller (login page) is responsible for calling authContext.setUser()
 * with the response. This function only hits the API.
 */
export async function login(data: LoginRequest): Promise<LoginResponse> {
  const response = await api.post<LoginResponse>("/api/auth/login", data);
  return response.data;
}

export async function getProfile(): Promise<ProfileDetails> {
  const response = await api.get<ProfileDetails>("/api/auth/me");
  return response.data;
}

export async function updateProfile(data: ProfileUpdateRequest): Promise<ProfileDetails> {
  const response = await api.put<ProfileDetails>("/api/auth/profile", data);
  return response.data;
}

export async function changePassword(data: PasswordChangeRequest): Promise<{ message: string }> {
  const response = await api.post<{ message: string }>("/api/auth/password", data);
  return response.data;
}

export async function uploadProfilePicture(file: File): Promise<{ profilePictureUrl: string; message: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post<{ profilePictureUrl: string; message: string }>(
    "/api/auth/profile-picture",
    formData
  );
  return response.data;
}

export async function deleteProfilePicture(): Promise<{ message: string }> {
  const response = await api.delete<{ message: string }>("/api/auth/profile-picture");
  return response.data;
}

export async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = localStorage.getItem("refreshToken");
  if (!refreshToken) return null;

  try {
    const response = await api.post<{ accessToken: string }>("/api/auth/refresh", { refreshToken });
    const newToken = response.data.accessToken;
    localStorage.setItem("token", newToken);
    return newToken;
  } catch {
    clearAuthStorage();
    return null;
  }
}

export function clearAuthStorage(): void {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");
  localStorage.removeItem("role");
  localStorage.removeItem("user");
  localStorage.removeItem("logged_user");
}

export function isAuthenticated(): boolean {
  return !!localStorage.getItem("token");
}

export function getCurrentRole(): string | null {
  return localStorage.getItem("role");
}

export function getCurrentUser(): string | null {
  return localStorage.getItem("user");
}
