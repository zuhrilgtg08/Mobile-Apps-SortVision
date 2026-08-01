import { useAuth } from "@/contexts/AuthContext";
import { Ionicons } from "@expo/vector-icons";
import { usePathname, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  Animated,
  Dimensions,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableWithoutFeedback,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const SIDEBAR_WIDTH = SCREEN_WIDTH * 0.75;

type NavItemProps = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  href: string;
  isActive: boolean;
  onPress: () => void;
};

function NavItem({ icon, label, href, isActive, onPress }: NavItemProps) {
  return (
    <Pressable
      onPress={onPress}
      style={[styles.navItem, isActive && styles.navItemActive]}
    >
      <Ionicons
        name={icon}
        size={20}
        color={isActive ? "#2563eb" : "#6b7280"}
      />
      <Text style={[styles.navLabel, isActive && styles.navLabelActive]}>
        {label}
      </Text>
    </Pressable>
  );
}

type SidebarProps = {
  visible: boolean;
  onClose: () => void;
};

export default function Sidebar({ visible, onClose }: SidebarProps) {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const pathname = usePathname();
  const { user, logout } = useAuth();
  // Lazy init lewat useState supaya nilai Animated stabil tanpa membaca ref.current saat render.
  const [translateX] = useState(() => new Animated.Value(-SIDEBAR_WIDTH));
  const [overlayOpacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(translateX, {
        toValue: visible ? 0 : -SIDEBAR_WIDTH,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(overlayOpacity, {
        toValue: visible ? 0.5 : 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start();
  }, [visible, translateX, overlayOpacity]);

  const navItems: NavItemProps[] = [
    {
      icon: "grid-outline",
      label: "Dashboard",
      href: "/(app)/dashboard",
      isActive: false,
      onPress: () => {},
    },
    {
      icon: "people-outline",
      label: "Users",
      href: "/(app)/users",
      isActive: false,
      onPress: () => {},
    },
    {
      icon: "cube-outline",
      label: "Products",
      href: "/(app)/products",
      isActive: false,
      onPress: () => {},
    },
    {
      icon: "layers-outline",
      label: "Categories",
      href: "/(app)/categories",
      isActive: false,
      onPress: () => {},
    },
    {
      icon: "shield-checkmark-outline",
      label: "Roles & Permission",
      href: "/(app)/roles",
      isActive: false,
      onPress: () => {},
    },
    {
      icon: "videocam-outline",
      label: "Live Camera",
      href: "/(app)/live-camera",
      isActive: false,
      onPress: () => {},
    },
    {
      icon: "hardware-chip-outline",
      label: "Arm Control",
      href: "/(app)/arm-control",
      isActive: false,
      onPress: () => {},
    },
    {
      icon: "git-commit-outline",
      label: "Conveyor",
      href: "/(app)/conveyor",
      isActive: false,
      onPress: () => {},
    },
    {
      icon: "scan-outline",
      label: "Scan QR",
      href: "/(app)/scan",
      isActive: false,
      onPress: () => {},
    },
    {
      icon: "return-down-back-outline",
      label: "QC Returns",
      href: "/(app)/returns",
      isActive: false,
      onPress: () => {},
    },
    {
      icon: "school-outline",
      label: "Training",
      href: "/(app)/training",
      isActive: false,
      onPress: () => {},
    },
    {
      icon: "pricetag-outline",
      label: "Label & Annotation",
      href: "/(app)/annotation",
      isActive: false,
      onPress: () => {},
    },
    {
      icon: "settings-outline",
      label: "Settings",
      href: "/(app)/settings",
      isActive: false,
      onPress: () => {},
    },
    {
      icon: "document-text-outline",
      label: "Logs Sistem",
      href: "/(app)/logs",
      isActive: false,
      onPress: () => {},
    },
  ];

  const items = navItems.map((item) => ({
    ...item,
    isActive: pathname === item.href,
    onPress: () => {
      onClose();
      router.push(item.href as any);
    },
  }));

  return (
    <View
      style={[StyleSheet.absoluteFill, { zIndex: 999 }]}
      pointerEvents={visible ? "auto" : "none"}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <Animated.View style={[styles.overlay, { opacity: overlayOpacity }]} />
      </TouchableWithoutFeedback>

      <Animated.View
        style={[
          styles.sidebar,
          { transform: [{ translateX }], paddingTop: insets.top },
        ]}
      >
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="scan-outline" size={28} color="#fff" />
          </View>
          <View>
            <Text style={styles.brandName}>SortVision</Text>
            <Text style={styles.brandSub}>Visual QC System</Text>
          </View>
        </View>

        <ScrollView
          style={styles.navScroll}
          showsVerticalScrollIndicator={false}
        >
          {items.map((item, idx) => (
            <NavItem key={idx} {...item} />
          ))}
        </ScrollView>

        <View
          style={[styles.userFooter, { paddingBottom: insets.bottom + 16 }]}
        >
          <View style={styles.userInfo}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user?.name
                  ?.split(" ")
                  .map((n) => n[0])
                  .join("")
                  .toUpperCase() || "U"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.userName} numberOfLines={1}>
                {user?.name}
              </Text>
              <Text style={styles.userRole}>{user?.role}</Text>
            </View>
          </View>
          <Pressable
            onPress={() => {
              void logout();
            }}
            style={styles.logoutBtn}
          >
            <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: "#000",
  },
  sidebar: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: SIDEBAR_WIDTH,
    backgroundColor: "#fff",
    zIndex: 10,
    shadowColor: "#000",
    shadowOffset: { width: 4, height: 0 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 20,
  },
  brand: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#f3f4f6",
  },
  logo: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  brandName: {
    fontSize: 18,
    fontFamily: "Poppins_700Bold",
    color: "#111827",
  },
  brandSub: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#6b7280",
  },
  navScroll: {
    flex: 1,
    paddingVertical: 12,
  },
  navItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    marginHorizontal: 8,
    borderRadius: 12,
    marginBottom: 2,
  },
  navItemActive: {
    backgroundColor: "#eff6ff",
  },
  navLabel: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#6b7280",
  },
  navLabelActive: {
    color: "#2563eb",
    fontFamily: "Poppins_600SemiBold",
  },
  userFooter: {
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
    paddingHorizontal: 20,
    paddingTop: 16,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  userInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
  },
  userName: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: "#111827",
  },
  userRole: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#6b7280",
  },
  logoutBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#fce7e7",
    justifyContent: "center",
    alignItems: "center",
  },
});
