import { apiRequest } from "@/services/api";

export type DevicePlatform = "ios" | "android" | "web";

/**
 * Daftarkan Expo push token perangkat ini ke akun yang sedang login.
 *
 * Backend memakai token sebagai kunci unik, bukan pasangan (user, device):
 * saat operator kedua login di HP yang sama, Expo memberi token yang sama dan
 * baris lama dipindahkan ke akun baru — jadi memanggil ini setiap login memang
 * perilaku yang diharapkan, bukan pemborosan.
 */
export async function registerDeviceToken(
  token: string,
  platform?: DevicePlatform,
): Promise<void> {
  await apiRequest("/device-tokens", {
    method: "POST",
    body: { token, ...(platform ? { platform } : {}) },
  });
}

/** Lepas perangkat ini dari notifikasi — dipanggil saat logout. */
export async function unregisterDeviceToken(token: string): Promise<void> {
  await apiRequest("/device-tokens", {
    method: "DELETE",
    body: { token },
  });
}
