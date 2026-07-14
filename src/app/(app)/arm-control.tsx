import StatusBadge from "@/components/StatusBadge";
import { useArm } from "@/contexts/ArmContext";
import { ArmCommandUnavailableError } from "@/services/armApi";
import { type DetectionItem } from "@/services/statusApi";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

/**
 * Daftar kategori produk sementara (placeholder). Idealnya diambil dari
 * endpoint kategori backend; lihat catatan di API_CONTRACT.md.
 */
const PRODUCT_CATEGORIES = [
  "Yogurt",
  "Susu UHT",
  "Keju",
  "Susu Kedelai",
  "Reject",
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

function ConnRow({
  label,
  active,
  onText,
  offText,
}: {
  label: string;
  active: boolean;
  onText: string;
  offText: string;
}) {
  return (
    <View style={styles.connRow}>
      <Text style={styles.connLabel}>{label}</Text>
      <View style={styles.connValue}>
        <View
          style={[styles.dot, { backgroundColor: active ? "#16a34a" : "#9ca3af" }]}
        />
        <Text style={[styles.connText, { color: active ? "#16a34a" : "#6b7280" }]}>
          {active ? onText : offText}
        </Text>
      </View>
    </View>
  );
}

function DetectionRow({ item, last }: { item: DetectionItem; last: boolean }) {
  const title = item.code ?? item.qr_value ?? `Product #${item.product_id ?? "?"}`;
  const meta = [item.camera, item.conveyor].filter(Boolean).join(" • ");
  return (
    <View style={[styles.tableRow, !last && styles.tableRowBorder]}>
      <View style={styles.tableLeft}>
        <Text style={styles.tableId}>{title}</Text>
        {meta ? <Text style={styles.tableProduct}>{meta}</Text> : null}
      </View>
      <View style={styles.tableRight}>
        {item.status ? <StatusBadge status={item.status} /> : null}
        <Text style={styles.tableTime}>{formatRelative(item.detected_at)}</Text>
      </View>
    </View>
  );
}

export default function ArmControlScreen() {
  const {
    status,
    armState,
    detections,
    isMqttConnected,
    isMqttConfigured,
    isLoading,
    refresh,
    sendCommand,
  } = useArm();

  const [selectedCategory, setSelectedCategory] = useState<string>(
    PRODUCT_CATEGORIES[0],
  );
  const [isSending, setIsSending] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await refresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [refresh]);

  const onSend = useCallback(async () => {
    setIsSending(true);
    try {
      await sendCommand(selectedCategory);
      Alert.alert("Command terkirim", `Kategori "${selectedCategory}" dikirim ke server.`);
    } catch (error) {
      const message =
        error instanceof ArmCommandUnavailableError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Gagal mengirim command.";
      Alert.alert("Tidak dapat mengirim command", message);
    } finally {
      setIsSending(false);
    }
  }, [selectedCategory, sendCommand]);

  const telemetryEntries = armState?.telemetry
    ? Object.entries(armState.telemetry).slice(0, 8)
    : [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={
        <RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />
      }
    >
      {/* Arm state */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.sectionTitle}>Status Arm</Text>
          {isLoading && !armState ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <StatusBadge status={armState?.state ?? "idle"} />
          )}
        </View>
        <Text style={styles.stateLabel}>
          {armState?.state_label ?? "Belum ada data"}
        </Text>
        {armState?.detail ? (
          <Text style={styles.detail}>{armState.detail}</Text>
        ) : null}
        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaKey}>Terakhir dilaporkan</Text>
            <Text style={styles.metaVal}>
              {formatRelative(armState?.reported_at ?? null)}
            </Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaKey}>Command terakhir</Text>
            <Text style={styles.metaVal} numberOfLines={2}>
              {armState?.last_command != null
                ? JSON.stringify(armState.last_command)
                : "-"}
            </Text>
          </View>
        </View>

        {telemetryEntries.length > 0 && (
          <View style={styles.telemetryBox}>
            {telemetryEntries.map(([k, v]) => (
              <View key={k} style={styles.telemetryRow}>
                <Text style={styles.telemetryKey}>{k}</Text>
                <Text style={styles.telemetryVal} numberOfLines={1}>
                  {typeof v === "object" ? JSON.stringify(v) : String(v)}
                </Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Connection indicators */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Koneksi</Text>
        <ConnRow
          label="Server (REST)"
          active={status?.status === "online"}
          onText="Online"
          offText={status ? "Offline" : "Belum terhubung"}
        />
        <ConnRow
          label="Broker MQTT (menurut backend)"
          active={!!status?.mqtt_connected}
          onText="Terhubung"
          offText="Terputus"
        />
        <ConnRow
          label="MQTT langsung (mobile)"
          active={isMqttConnected}
          onText="Terhubung"
          offText={isMqttConfigured ? "Terputus" : "Tidak dikonfigurasi"}
        />
        {!isMqttConfigured && (
          <Text style={styles.hint}>
            Set EXPO_PUBLIC_MQTT_WS_URL untuk telemetry realtime. Tanpa itu,
            data diambil lewat polling REST.
          </Text>
        )}
      </View>

      {/* Command */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Kirim ke Zona</Text>
        <Text style={styles.hint}>
          Pilih kategori produk, backend akan meresolusi sudut sendi (TargetZonePreset)
          dan publish command ke arm.
        </Text>
        <View style={styles.chipsRow}>
          {PRODUCT_CATEGORIES.map((cat) => {
            const active = cat === selectedCategory;
            return (
              <Pressable
                key={cat}
                onPress={() => setSelectedCategory(cat)}
                style={[styles.chip, active && styles.chipActive]}
              >
                <Text style={[styles.chipText, active && styles.chipTextActive]}>
                  {cat}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Pressable
          onPress={onSend}
          disabled={isSending}
          style={[styles.sendBtn, isSending && styles.sendBtnDisabled]}
        >
          {isSending ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="send-outline" size={18} color="#fff" />
              <Text style={styles.sendBtnText}>Kirim ke Zona Ini</Text>
            </>
          )}
        </Pressable>
      </View>

      {/* Detections */}
      <View style={styles.card}>
        <View style={styles.cardHeaderRow}>
          <Text style={styles.sectionTitle}>Deteksi Terbaru</Text>
          <Text style={styles.sourceTag}>
            {isMqttConnected ? "realtime" : "REST"}
          </Text>
        </View>
        {detections.length === 0 ? (
          <Text style={styles.empty}>Belum ada deteksi.</Text>
        ) : (
          detections
            .slice(0, 15)
            .map((det, idx, arr) => (
              <DetectionRow
                key={`${det.code ?? det.detected_at ?? idx}-${idx}`}
                item={det}
                last={idx === arr.length - 1}
              />
            ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  card: {
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
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#111827",
  },
  stateLabel: {
    fontSize: 20,
    fontFamily: "Poppins_700Bold",
    color: "#111827",
  },
  detail: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#6b7280",
    marginTop: 4,
  },
  metaGrid: {
    flexDirection: "row",
    gap: 12,
    marginTop: 16,
  },
  metaItem: { flex: 1 },
  metaKey: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    color: "#9ca3af",
    marginBottom: 2,
  },
  metaVal: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: "#111827",
  },
  telemetryBox: {
    marginTop: 16,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    padding: 12,
    gap: 6,
  },
  telemetryRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  telemetryKey: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#6b7280",
  },
  telemetryVal: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    color: "#111827",
    flexShrink: 1,
    textAlign: "right",
  },
  connRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },
  connLabel: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#374151",
    flex: 1,
  },
  connValue: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  connText: { fontSize: 13, fontFamily: "Poppins_600SemiBold" },
  hint: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#9ca3af",
    marginTop: 4,
    marginBottom: 12,
    lineHeight: 18,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 99,
    backgroundColor: "#f3f4f6",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  chipActive: { backgroundColor: "#eff6ff", borderColor: "#2563eb" },
  chipText: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#6b7280",
  },
  chipTextActive: { color: "#2563eb", fontFamily: "Poppins_600SemiBold" },
  sendBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563eb",
    paddingVertical: 14,
    borderRadius: 12,
  },
  sendBtnDisabled: { opacity: 0.6 },
  sendBtnText: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: "#fff",
  },
  sourceTag: {
    fontSize: 11,
    fontFamily: "Poppins_500Medium",
    color: "#9ca3af",
    textTransform: "uppercase",
  },
  empty: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#9ca3af",
    paddingVertical: 8,
  },
  tableRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },
  tableRowBorder: { borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  tableLeft: { flex: 1, paddingRight: 8 },
  tableId: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: "#111827" },
  tableProduct: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#6b7280",
    marginTop: 2,
  },
  tableRight: { alignItems: "flex-end", gap: 4 },
  tableTime: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#9ca3af",
  },
});
