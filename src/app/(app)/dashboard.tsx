import { View, Text, StyleSheet, ScrollView, RefreshControl, Pressable } from "react-native";
import { useCallback, useMemo, useState } from "react";
import StatCard from "@/components/StatCard";
import StatusBadge from "@/components/StatusBadge";
import { useArm } from "@/contexts/ArmContext";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useDashboardStats } from "@/hooks/useDashboardStats";
import { type DetectionItem } from "@/services/statusApi";
import { type StatsRange } from "@/services/statsApi";

/**
 * Pintasan ke layar yang paling sering dituju dari dashboard. Sengaja hanya
 * berisi rute yang benar-benar ada — scan QR menyusul setelah expo-camera
 * dipasang, daripada menampilkan tombol yang tidak melakukan apa-apa.
 */
const QUICK_ACTIONS = [
  { label: "Live Camera", icon: "videocam-outline" as const, href: "/(app)/live-camera" as const, color: "#2563eb" },
  { label: "Retur", icon: "return-down-back-outline" as const, href: "/(app)/returns" as const, color: "#e11d48" },
  { label: "Training", icon: "school-outline" as const, href: "/(app)/training" as const, color: "#7c3aed" },
  { label: "Log", icon: "document-text-outline" as const, href: "/(app)/logs" as const, color: "#0891b2" },
];

const RANGES: { key: StatsRange; label: string }[] = [
  { key: "today", label: "Hari ini" },
  { key: "7d", label: "7 hari" },
  { key: "30d", label: "30 hari" },
];

/**
 * Warna Tailwind yang dipakai `Detection::STATUSES` di backend → hex, supaya
 * batang distribusi memakai warna yang sama dengan dashboard web. Warna yang
 * belum dikenal jatuh ke abu-abu netral, bukan bikin grafiknya kosong.
 */
const STATUS_COLORS: Record<string, string> = {
  green: "#16a34a",
  amber: "#d97706",
  red: "#dc2626",
  orange: "#ea580c",
  rose: "#e11d48",
  blue: "#2563eb",
};

function statusColor(name: string): string {
  return STATUS_COLORS[name] ?? "#9ca3af";
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("id-ID").format(value);
}

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
  const [range, setRange] = useState<StatsRange>("today");
  const [isRefreshing, setIsRefreshing] = useState(false);

  const statsQuery = useDashboardStats(range);
  const data = statsQuery.data;

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([refresh(), statsQuery.refetch()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh, statsQuery]);

  const cards = useMemo(() => {
    const s = data?.stats;

    return [
      {
        title: "Total Scan",
        value: s ? formatNumber(s.total) : "—",
        icon: "scan-outline" as const,
        color: "#2563eb",
        subtitle: RANGES.find((r) => r.key === range)?.label,
      },
      {
        title: "Defect",
        value: s ? formatNumber(s.defective) : "—",
        icon: "warning-outline" as const,
        color: "#dc2626",
        subtitle: s ? `${formatNumber(s.unreadable)} QR tak terbaca` : undefined,
      },
      {
        title: "Pass Rate",
        value: s ? `${s.pass_rate}%` : "—",
        icon: "checkmark-circle-outline" as const,
        color: "#16a34a",
        subtitle: s ? `${formatNumber(s.passed)} lolos` : undefined,
      },
      {
        title: "Kamera Aktif",
        value: s ? formatNumber(s.active_cameras) : "—",
        icon: "videocam-outline" as const,
        color: "#ca8a04",
        // Throughput sengaja tidak mengikuti range — ini kondisi line sekarang.
        subtitle: s ? `${s.throughput_per_minute}/menit` : undefined,
      },
    ];
  }, [data, range]);

  // Hanya status yang benar-benar muncul yang digambar; backend tetap mengirim
  // semua status (termasuk nol) supaya sumbu grafik lain tidak berubah bentuk.
  const distribution = (data?.distribution ?? []).filter((d) => d.count > 0);

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

      <View style={styles.rangeRow}>
        {RANGES.map((r) => {
          const active = r.key === range;
          return (
            <Pressable
              key={r.key}
              onPress={() => setRange(r.key)}
              style={[styles.rangeChip, active && styles.rangeChipActive]}
            >
              <Text style={[styles.rangeText, active && styles.rangeTextActive]}>
                {r.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <View style={styles.statsGrid}>
        {cards.map((stat, idx) => (
          <View key={stat.title} style={[styles.statWrapper, idx % 2 === 0 ? { paddingRight: 6 } : { paddingLeft: 6 }]}>
            <StatCard {...stat} />
          </View>
        ))}
      </View>

      <View style={styles.quickRow}>
        {QUICK_ACTIONS.map((action) => (
          <Pressable
            key={action.href}
            style={styles.quickItem}
            onPress={() => router.push(action.href)}
          >
            <View style={[styles.quickIcon, { backgroundColor: `${action.color}1a` }]}>
              <Ionicons name={action.icon} size={20} color={action.color} />
            </View>
            <Text style={styles.quickLabel} numberOfLines={1}>
              {action.label}
            </Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.sectionTitle}>Distribusi Deteksi</Text>
        {statsQuery.isError ? (
          <Text style={styles.empty}>
            {statsQuery.error instanceof Error
              ? statsQuery.error.message
              : "Gagal memuat statistik."}
          </Text>
        ) : distribution.length === 0 ? (
          <Text style={styles.empty}>
            {statsQuery.isLoading ? "Memuat..." : "Belum ada deteksi pada rentang ini."}
          </Text>
        ) : (
          <View style={styles.chartPlaceholder}>
            {distribution.map((slice) => (
              <View key={slice.key} style={styles.chartRow}>
                <View style={styles.chartTrack}>
                  <View
                    style={[
                      styles.chartBar,
                      // Sisakan lebar minimal supaya status dengan porsi sangat
                      // kecil tetap terlihat, bukan menyusut jadi tak tampak.
                      { width: `${Math.max(slice.pct, 2)}%`, backgroundColor: statusColor(slice.color) },
                    ]}
                  />
                </View>
                <Text style={styles.chartLabel}>
                  {slice.label} {slice.pct}%
                </Text>
              </View>
            ))}
          </View>
        )}
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
  chartTrack: { flex: 1, height: 24, borderRadius: 6, backgroundColor: "#f3f4f6", overflow: "hidden" },
  chartBar: { height: 24, borderRadius: 6 },
  rangeRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  quickRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  quickItem: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 12,
    alignItems: "center",
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  quickIcon: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  quickLabel: { fontSize: 11, fontFamily: "Poppins_500Medium", color: "#374151" },
  rangeChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: "#f3f4f6",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  rangeChipActive: { backgroundColor: "#eff6ff", borderColor: "#2563eb" },
  rangeText: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#6b7280" },
  rangeTextActive: { color: "#2563eb", fontFamily: "Poppins_600SemiBold" },
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
