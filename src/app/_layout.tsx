import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import AppErrorBoundary from "@/components/AppErrorBoundary";
import { AuthProvider } from "@/contexts/AuthContext";
import { createQueryClient } from "@/lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";
import {
  useFonts,
  Poppins_400Regular,
  Poppins_500Medium,
  Poppins_600SemiBold,
  Poppins_700Bold,
  Poppins_800ExtraBold,
} from "@expo-google-fonts/poppins";
import { ActivityIndicator, View } from "react-native";

/**
 * Expo Router memakai export bernama `ErrorBoundary` untuk membungkus segmen
 * route ini. Karena ada di root layout, seluruh aplikasi (termasuk
 * `AuthProvider` dan semua layar di bawahnya) ikut terlindungi.
 */
export { AppErrorBoundary as ErrorBoundary };

export default function RootLayout() {
  // Dibuat sekali lewat lazy initializer: menaruh `new QueryClient()` langsung
  // di body komponen akan membuang seluruh cache tiap kali root re-render.
  const [queryClient] = useState(createQueryClient);

  const [fontsLoaded] = useFonts({
    Poppins_400Regular,
    Poppins_500Medium,
    Poppins_600SemiBold,
    Poppins_700Bold,
    Poppins_800ExtraBold,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#fff" }}>
        <ActivityIndicator size="large" color="#2563eb" />
      </View>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <StatusBar style="dark" />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="index" />
          <Stack.Screen name="login" />
          <Stack.Screen name="register" />
          <Stack.Screen name="forgot-password" />
          <Stack.Screen name="reset-password" />
          <Stack.Screen name="(app)" />
        </Stack>
      </AuthProvider>
    </QueryClientProvider>
  );
}
