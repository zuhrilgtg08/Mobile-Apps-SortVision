import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const PERMISSIONS = [
  "Dashboard", "Users", "Products", "Categories",
  "Live Camera", "Training", "Annotation", "Settings", "Logs",
];

const ROLES = [
  {
    name: "Administrator",
    users: 2,
    permissions: PERMISSIONS.map(() => true),
  },
  {
    name: "Supervisor",
    users: 4,
    permissions: PERMISSIONS.map((p) => p !== "Settings" && p !== "Users"),
  },
  {
    name: "Operator",
    users: 8,
    permissions: PERMISSIONS.map((p) => p === "Dashboard" || p === "Live Camera" || p === "Products"),
  },
  {
    name: "Manager",
    users: 3,
    permissions: PERMISSIONS.map((p) => p !== "Users" && p !== "Settings"),
  },
];

export default function RolesScreen() {
  const [expanded, setExpanded] = useState<number | null>(0);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {ROLES.map((role, idx) => (
        <View key={idx} style={styles.card}>
          <Pressable style={styles.cardHeader} onPress={() => setExpanded(expanded === idx ? null : idx)}>
            <View style={styles.cardLeft}>
              <View style={styles.iconWrap}>
                <Ionicons name="shield-checkmark-outline" size={24} color="#2563eb" />
              </View>
              <View>
                <Text style={styles.roleName}>{role.name}</Text>
                <Text style={styles.roleUsers}>{role.users} users</Text>
              </View>
            </View>
            <Ionicons name={expanded === idx ? "chevron-up" : "chevron-down"} size={20} color="#6b7280" />
          </Pressable>

          {expanded === idx && (
            <View style={styles.permissionsGrid}>
              {PERMISSIONS.map((perm, pIdx) => (
                <View key={pIdx} style={styles.permRow}>
                  <Text style={styles.permLabel}>{perm}</Text>
                  <Ionicons
                    name={role.permissions[pIdx] ? "checkmark-circle" : "close-circle"}
                    size={20}
                    color={role.permissions[pIdx] ? "#16a34a" : "#d1d5db"}
                  />
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    overflow: "hidden",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  roleName: { fontSize: 16, fontFamily: "Poppins_600SemiBold", color: "#111827" },
  roleUsers: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#6b7280", marginTop: 2 },
  permissionsGrid: {
    paddingHorizontal: 16,
    paddingBottom: 16,
    gap: 8,
  },
  permRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 6,
  },
  permLabel: { fontSize: 14, fontFamily: "Poppins_400Regular", color: "#374151" },
});
