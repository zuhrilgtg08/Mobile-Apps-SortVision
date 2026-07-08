import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StatusBadge from "@/components/StatusBadge";

const LOGS = [
  { id: 1, level: "info", message: "Sistem SortVision berhasil diinisialisasi", timestamp: "2026-07-08 10:00:00", user: "System" },
  { id: 2, level: "warning", message: "Confidence threshold turun di bawah 80% pada ICAM-300 Line 2", timestamp: "2026-07-08 09:45:00", user: "Auto" },
  { id: 3, level: "error", message: "Koneksi kamera ICAM-300 Line 3 terputus", timestamp: "2026-07-08 09:30:00", user: "System" },
  { id: 4, level: "info", message: "Training model YOLOv8n v2.1 selesai (accuracy: 96.8%)", timestamp: "2026-07-08 09:00:00", user: "System" },
  { id: 5, level: "info", message: "User Administrator berhasil login", timestamp: "2026-07-08 08:30:00", user: "admin@sortvision.id" },
  { id: 6, level: "warning", message: "Dataset training tersisa 200 sample, disarankan menambah data", timestamp: "2026-07-08 08:00:00", user: "Auto" },
  { id: 7, level: "info", message: "Produk Yogurt Strawberry #001 berhasil discan", timestamp: "2026-07-08 07:55:00", user: "ICAM-300 Line 1" },
  { id: 8, level: "error", message: "Gagal menyimpan frame deteksi - disk penuh", timestamp: "2026-07-08 07:30:00", user: "System" },
];

const LEVEL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  info: "information-circle-outline",
  warning: "warning-outline",
  error: "alert-circle-outline",
};

const LEVEL_COLORS: Record<string, string> = {
  info: "#2563eb",
  warning: "#ca8a04",
  error: "#dc2626",
};

export default function LogsScreen() {
  const [filter, setFilter] = useState<string | null>(null);

  const filtered = filter ? LOGS.filter((l) => l.level === filter) : LOGS;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.filters}>
        {[null, "info", "warning", "error"].map((f) => (
          <Pressable
            key={f || "all"}
            style={[styles.filterChip, filter === f && styles.filterChipActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f ? f.charAt(0).toUpperCase() + f.slice(1) : "All"}
            </Text>
          </Pressable>
        ))}
      </View>

      {filtered.map((log) => (
        <View key={log.id} style={styles.logCard}>
          <View style={styles.logHeader}>
            <View style={styles.logLeft}>
              <Ionicons name={LEVEL_ICONS[log.level]} size={20} color={LEVEL_COLORS[log.level]} />
              <Text style={styles.logMessage} numberOfLines={2}>{log.message}</Text>
            </View>
            <StatusBadge status={log.level} />
          </View>
          <View style={styles.logFooter}>
            <Text style={styles.logMeta}>{log.user}</Text>
            <Text style={styles.logMeta}>{log.timestamp}</Text>
          </View>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  filters: { flexDirection: "row", gap: 8, marginBottom: 16 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: "#f3f4f6",
  },
  filterChipActive: { backgroundColor: "#2563eb" },
  filterText: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "#6b7280" },
  filterTextActive: { color: "#fff" },
  logCard: {
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  logHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  logLeft: { flexDirection: "row", gap: 8, flex: 1, alignItems: "flex-start" },
  logMessage: { flex: 1, fontSize: 13, fontFamily: "Poppins_400Regular", color: "#374151", lineHeight: 18 },
  logFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#f3f4f6",
  },
  logMeta: { fontSize: 11, fontFamily: "Poppins_400Regular", color: "#9ca3af" },
});
