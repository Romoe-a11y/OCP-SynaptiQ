import api from "./api";
import type {
  UserAccess,
  UserAccessCreateRequest,
  UserAccessUpdateRequest,
} from "../types";

export async function getUsers(): Promise<UserAccess[]> {
  const response = await api.get<UserAccess[]>("/api/utilisateurs");
  return response.data;
}

export async function createUserAccess(payload: UserAccessCreateRequest): Promise<UserAccess> {
  const response = await api.post<UserAccess>("/api/utilisateurs", payload);
  return response.data;
}

export async function updateUserAccess(id: number, payload: UserAccessUpdateRequest): Promise<UserAccess> {
  const response = await api.put<UserAccess>(`/api/utilisateurs/${id}`, payload);
  return response.data;
}

export async function resetUserPassword(id: number): Promise<UserAccess> {
  const response = await api.post<UserAccess>(`/api/utilisateurs/${id}/reset-password`);
  return response.data;
}

export async function deleteUserAccess(id: number): Promise<void> {
  await api.delete(`/api/utilisateurs/${id}`);
}
