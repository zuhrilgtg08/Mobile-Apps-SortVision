import { apiRequest } from "@/services/api";

export type Profile = {
  id: number;
  name: string;
  email: string;
  role: string;
  is_active: boolean;
  email_verified_at: string | null;
};

export type ProfileInput = {
  name: string;
  email: string;
};

export type PasswordInput = {
  current_password: string;
  password: string;
  password_confirmation: string;
};

export async function getProfile(): Promise<Profile> {
  const response = await apiRequest<{ user: Profile }>("/profile");
  return response.user;
}

export async function updateProfile(input: ProfileInput): Promise<Profile> {
  const response = await apiRequest<{ message: string; user: Profile }>(
    "/profile",
    { method: "PUT", body: input },
  );
  return response.user;
}

/**
 * Ganti password. Backend mencabut token perangkat lain tapi mempertahankan
 * token request ini, jadi sesi yang sedang jalan tidak perlu login ulang.
 */
export async function updatePassword(input: PasswordInput): Promise<string> {
  const response = await apiRequest<{ message: string }>("/profile/password", {
    method: "PUT",
    body: input,
  });
  return response.message;
}
