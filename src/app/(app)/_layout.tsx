import { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Stack, usePathname, useRouter } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Sidebar from "@/components/Sidebar";
import { ArmProvider } from "@/contexts/ArmContext";

function Topbar({ onMenuPress, title }: { onMenuPress: () => void; title: string }) {
  const insets = useSafeAreaInsets();
  const router = useRouter();

  return (
    <View style={[styles.topbar, { paddingTop: insets.top + 8 }]}>
      <View style={styles.topbarInner}>
        <Pressable onPress={onMenuPress} style={styles.iconBtn}>
          <Ionicons name="menu-outline" size={26} color="#111827" />
        </Pressable>
        <Text style={styles.topbarTitle} numberOfLines={1}>{title}</Text>
        <Pressable onPress={() => router.push("/(app)/profile" as any)} style={styles.avatarSmall}>
          <Text style={styles.avatarSmallText}>A</Text>
        </Pressable>
      </View>
    </View>
  );
}

export default function AppLayout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();

  const pageTitles: Record<string, string> = {
    "/(app)/dashboard": "Dashboard",
    "/(app)/users": "Users",
    "/(app)/products": "Products",
    "/(app)/categories": "Categories",
    "/(app)/roles": "Roles & Permission",
    "/(app)/live-camera": "Live Camera",
    "/(app)/arm-control": "Arm Control",
    "/(app)/returns": "QC Returns",
    "/(app)/training": "Training",
    "/(app)/annotation": "Label & Annotation",
    "/(app)/settings": "Settings",
    "/(app)/logs": "Logs Sistem",
    "/(app)/profile": "Profile",
  };

  const title = pageTitles[pathname] || "SortVision";

  return (
    <ArmProvider>
      <View style={styles.root}>
        <Topbar onMenuPress={() => setSidebarOpen(true)} title={title} />
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="dashboard" />
          <Stack.Screen name="users" />
          <Stack.Screen name="products" />
          <Stack.Screen name="categories" />
          <Stack.Screen name="roles" />
          <Stack.Screen name="live-camera" />
          <Stack.Screen name="arm-control" />
          <Stack.Screen name="returns" />
          <Stack.Screen name="training" />
          <Stack.Screen name="annotation" />
          <Stack.Screen name="settings" />
          <Stack.Screen name="logs" />
          <Stack.Screen name="profile" />
        </Stack>
        <Sidebar visible={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      </View>
    </ArmProvider>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: "#f9fafb" },
  topbar: {
    backgroundColor: "#fff",
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
    zIndex: 100,
  },
  topbarInner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  iconBtn: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#f9fafb",
  },
  topbarTitle: {
    fontSize: 17,
    fontFamily: "Poppins_600SemiBold",
    color: "#111827",
    flex: 1,
    textAlign: "center",
    marginHorizontal: 12,
  },
  avatarSmall: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarSmallText: { color: "#fff", fontSize: 14, fontFamily: "Poppins_600SemiBold" },
});
