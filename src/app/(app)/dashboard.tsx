import { View, Text, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { useCallback, useState } from "react";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { useArm } from "@/contexts/ArmContext";
import { type DetectionItem } from "@/services/statusApi";

// TODO: butuh endpoint agregat baru di backend (total scans, defects, accuracy,
// jumlah kamera aktif). Endpoint /status, /arm, /detections yang ada belum
// mengekspos angka agregat ini, jadi kartu di bawah masih memakai contoh statis.
const MOCK_STATS = [
  { title: "Total Scans", value: "12,847", icon: "scan-outline" as const, color: "#2563eb", delta: { value: "12%", positive: true } },
  { title: "Defects", value: "342", icon: "warning-outline" as const, color: "#dc2626", delta: { value: "3%", positive: false } },
  { title: "Accuracy", value: "97.3%", icon: "checkmark-circle-outline" as const, color: "#16a34a", delta: { value: "1.2%", positive: true } },
  { title: "Active Cameras", value: "4", icon: "videocam-outline" as const, color: "#ca8a04", subtitle: "from 6 total" },
];

function formatRelative(iso: string | null): string {
  if (!iso) return "-";
  const t = new Date(iso).getTime();
  if (isNaN(t)) return iso;
  const diff = Date.now() - t;
  if (diff < 0) return new Date(iso).toLocaleTimeString();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s} detik lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return new Date(iso).toLocaleString();
}

function detectionTitle(item: DetectionItem): string {
  return item.code ?? item.qr_value ?? `Product #${item.product_id ?? "?"}`;
}

export default function DashboardScreen() {
  const { status, armState, detections, refresh } = useArm();
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  const recent = detections.slice(0, 5);

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      <View style={styles.statsRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.greeting}>Selamat datang kembali!</Text>
          <Text style={styles.date}>
            {status
              ? `Server ${status.status === "online" ? "online" : "offline"} • Ringkasan QC hari ini`
              : "Ringkasan QC hari ini"}
          </Text>
        </View>
        <StatusBadge status={armState?.state ?? "idle"} />
      </View>

      <View style={styles.statsGrid}>
        {MOCK_STATS.map((stat, idx) => (
          <View key={idx} style={[styles.statWrapper, idx % 2 === 0 ? { paddingRight: 6 } : { paddingLeft: 6 }]}>
            <StatCard {...stat} />
          </View>
        ))}
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.sectionTitle}>Distribusi Deteksi</Text>
        {/* TODO: butuh endpoint agregat distribusi di backend; sementara statis. */}
        <View style={styles.chartPlaceholder}>
          {["Pass 87%", "Fail 8%", "Warning 5%"].map((item, idx) => {
            const colors = ["#16a34a", "#dc2626", "#ca8a04"];
            const widths = ["87%", "8%", "5%" as string];
            return (
              <View key={idx} style={styles.chartRow}>
                <View style={[styles.chartBar, { width: widths[idx] as any, backgroundColor: colors[idx] }]} />
                <Text style={styles.chartLabel}>{item}</Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={styles.tableCard}>
        <Text style={styles.sectionTitle}>Deteksi Terbaru</Text>
        {recent.length === 0 ? (
          <Text style={styles.empty}>Belum ada deteksi.</Text>
        ) : (
          recent.map((det, idx) => (
            <View key={`${det.code ?? det.detected_at ?? idx}-${idx}`} style={[styles.tableRow, idx < recent.length - 1 && styles.tableRowBorder]}>
              <View style={styles.tableLeft}>
                <Text style={styles.tableId}>{detectionTitle(det)}</Text>
                <Text style={styles.tableProduct}>
                  {[det.camera, det.conveyor].filter(Boolean).join(" • ") || "—"}
                </Text>
              </View>
              <View style={styles.tableRight}>
                {det.status ? <StatusBadge status={det.status} /> : null}
                <Text style={styles.tableTime}>{formatRelative(det.detected_at)}</Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 16,
  },
  greeting: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#111827" },
  date: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#6b7280", marginTop: 2 },
  statsGrid: { flexDirection: "row", flexWrap: "wrap", marginBottom: 16 },
  statWrapper: { width: "50%", marginBottom: 12 },
  chartCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  sectionTitle: { fontSize: 16, fontFamily: "Poppins_600SemiBold", color: "#111827", marginBottom: 16 },
  chartPlaceholder: { gap: 12 },
  chartRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  chartBar: { height: 24, borderRadius: 6 },
  chartLabel: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#374151" },
  tableCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  tableLeft: { flex: 1 },
  tableId: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: "#111827" },
  tableProduct: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#6b7280", marginTop: 2 },
  tableRight: { alignItems: "flex-end", gap: 4 },
  tableTime: { fontSize: 11, fontFamily: "Poppins_400Regular", color: "#9ca3af" },
  empty: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#9ca3af", paddingVertical: 8 },
});
