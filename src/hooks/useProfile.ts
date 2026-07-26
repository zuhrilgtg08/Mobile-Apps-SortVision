import { queryKeys } from "@/lib/queryClient";
import {
  getProfile,
  updatePassword,
  updateProfile,
  type PasswordInput,
  type ProfileInput,
} from "@/services/profileApi";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export function useProfile() {
  return useQuery({
    queryKey: queryKeys.profile.all,
    queryFn: getProfile,
  });
}

export function useUpdateProfile() {
  const client = useQueryClient();

  return useMutation({
    mutationFn: (input: ProfileInput) => updateProfile(input),
    onSuccess: (user) => {
      // Tulis langsung hasil server ke cache: nama/email yang tampil di layar
      // lain ikut berubah tanpa menunggu refetch.
      client.setQueryData(queryKeys.profile.all, user);
      // Daftar user (kalau role-nya boleh melihat) memuat baris yang sama.
      void client.invalidateQueries({ queryKey: queryKeys.users.all });
    },
  });
}

export function useUpdatePassword() {
  return useMutation({
    mutationFn: (input: PasswordInput) => updatePassword(input),
  });
}
