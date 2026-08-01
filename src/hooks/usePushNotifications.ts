import {
  registerDeviceToken,
  unregisterDeviceToken,
  type DevicePlatform,
} from "@/services/notificationApi";
import Constants from "expo-constants";
import * as Device from "expo-device";
import * as Notifications from "expo-notifications";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";

/**
 * Tampilkan notifikasi walau aplikasi sedang dibuka. Tanpa handler ini Expo
 * membuang notifikasi yang tiba di foreground — operator yang sedang menatap
 * layar justru tidak melihat alarm macet.
 *
 * Catatan SDK 57: `shouldShowAlert` sudah deprecated, diganti pasangan
 * `shouldShowBanner` + `shouldShowList`.
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

function currentPlatform(): DevicePlatform | undefined {
  if (Platform.OS === "ios" || Platform.OS === "android") return Platform.OS;
  if (Platform.OS === "web") return "web";
  return undefined;
}

/**
 * Ambil Expo push token perangkat ini.
 *
 * Mengembalikan `null` — bukan melempar — untuk semua kondisi "memang tidak
 * bisa": emulator (tidak punya push sama sekali), izin ditolak, atau
 * `projectId` belum ada di konfigurasi. Notifikasi adalah pelengkap, jadi
 * kegagalannya tidak boleh menghalangi login.
 */
async function fetchExpoPushToken(): Promise<string | null> {
  // Emulator/simulator tidak bisa menerima push; menanyakannya hanya
  // memunculkan dialog izin yang tak berguna.
  if (!Device.isDevice) {
    return null;
  }

  if (Platform.OS === "android") {
    // Android 8+ mewajibkan channel; tanpa ini notifikasi tidak berbunyi.
    await Notifications.setNotificationChannelAsync("default", {
      name: "default",
      importance: Notifications.AndroidImportance.HIGH,
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let status = existing.status;

  if (status !== "granted" && existing.canAskAgain) {
    status = (await Notifications.requestPermissionsAsync()).status;
  }

  if (status !== "granted") {
    return null;
  }

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    // Tanpa projectId, Expo tidak bisa menerbitkan token.
    return null;
  }

  const token = await Notifications.getExpoPushTokenAsync({ projectId });
  return token.data;
}

/**
 * Daftarkan perangkat ini untuk notifikasi selama user login, dan lepaskan saat
 * logout.
 *
 * Token disimpan di ref supaya proses logout tahu token mana yang harus
 * dilepas — pada saat itu izin/token sudah tidak perlu diminta ulang.
 */
export function usePushRegistration(isAuthenticated: boolean) {
  const tokenRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated) {
      // Logout: lepas perangkat supaya operator berikutnya di HP ini tidak
      // menerima alert milik akun sebelumnya.
      const token = tokenRef.current;
      tokenRef.current = null;
      if (token) {
        void unregisterDeviceToken(token).catch(() => {});
      }
      return;
    }

    void (async () => {
      try {
        const token = await fetchExpoPushToken();
        if (cancelled || !token) return;

        await registerDeviceToken(token, currentPlatform());
        if (!cancelled) {
          tokenRef.current = token;
        }
      } catch {
        // Notifikasi bersifat pelengkap: kegagalan mendaftar tidak boleh
        // menggagalkan sesi yang sudah berhasil login.
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);
}
