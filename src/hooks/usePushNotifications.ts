import {
  registerDeviceToken,
  unregisterDeviceToken,
  type DevicePlatform,
} from "@/services/notificationApi";
import Constants from "expo-constants";
import * as Device from "expo-device";
import { isRunningInExpoGo } from "expo";
import { useEffect, useRef } from "react";
import { Platform } from "react-native";
import type * as NotificationsType from "expo-notifications";

/**
 * SDK 57 mencabut dukungan expo-notifications di Expo Go untuk Android —
 * bahkan `import`-nya saja langsung throw. Fitur push jadi hanya aktif di
 * development build; di Expo Go/Android kita no-op saja dan menghindari
 * require modulnya sama sekali.
 */
const PUSH_UNSUPPORTED = Platform.OS === "android" && isRunningInExpoGo();

const Notifications: typeof NotificationsType | null = PUSH_UNSUPPORTED
  ? null
  : (require("expo-notifications") as typeof NotificationsType);

/**
 * Tampilkan notifikasi walau aplikasi sedang dibuka. Tanpa handler ini Expo
 * membuang notifikasi yang tiba di foreground — operator yang sedang menatap
 * layar justru tidak melihat alarm macet.
 *
 * Catatan SDK 57: `shouldShowAlert` sudah deprecated, diganti pasangan
 * `shouldShowBanner` + `shouldShowList`.
 */
if (Notifications) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowBanner: true,
      shouldShowList: true,
      shouldPlaySound: true,
      shouldSetBadge: false,
    }),
  });
}

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
  if (!Notifications) {
    return null;
  }

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
