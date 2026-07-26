import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import {
  useConveyorAlerts,
  useConveyorCommand,
  useConveyorStatus,
} from "@/hooks/useConveyor";
import { ApiError } from "@/services/api";
import {
  type ConveyorAlert,
  type ConveyorCommand,
  type ConveyorEvent,
} from "@/services/conveyorApi";
import { Ionicons } from "@expo/vector-icons";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

/** Kontrol line. `speed` butuh nilai RPM, jadi tidak ditawarkan di sini. */
const CONTROLS: {
  key: Exclude<ConveyorCommand, "speed">;
  label: string;
  icon: "play" | "stop" | "swap-horizontal";
  color: string;
}[] = [
  { key: "start", label: "Start", icon: "play", color: "#16a34a" },
  { key: "stop", label: "Stop", icon: "stop", color: "#dc2626" },
  { key: "reverse", label: "Reverse", icon: "swap-horizontal", color: "#ca8a04" },
];

const EVENT_LABELS: Record<ConveyorEvent, string> = {
  jam: "Macet",
  off_flow: "Off-flow",
};

const FILTERS: { key: ConveyorEvent | ""; label: string }[] = [
  { key: "", label: "Semua" },
  { key: "jam", label: "Macet" },
  { key: "off_flow", label: "Off-flow" },
];

function formatTime(iso: string | null): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function AlertRow({ alert }: { alert: ConveyorAlert }) {
  const isJam = alert.event === "jam";

  return (
    <View style={styles.alertRow}>
      <View style={[styles.alertIcon, { backgroundColor: isJam ? "#fee2e2" : "#fef9c3" }]}>
        <Ionicons
          name={isJam ? "alert-circle" : "warning"}
          size={18}
          color={isJam ? "#dc2626" : "#ca8a04"}
        />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.alertTitle}>
          {alert.event ? EVENT_LABELS[alert.event] : "Anomali"}
          {alert.conveyor ? ` · ${alert.conveyor}` : ""}
        </Text>
        <Text style={styles.alertMessage} numberOfLines={2}>
          {alert.message}
        </Text>
        <Text style={styles.alertTime}>{formatTime(alert.logged_at)}</Text>
      </View>
    </View>
  );
}

export default function ConveyorScreen() {
  const [filter, setFilter] = useState<ConveyorEvent | "">("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const statusQuery = useConveyorStatus();
  const alertsQuery = useConveyorAlerts(filter ? { event: filter } : {});
  const command = useConveyorCommand();

  const status = statusQuery.data;
  const alerts = alertsQuery.data?.data ?? [];

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([statusQuery.refetch(), alertsQuery.refetch()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [statusQuery, alertsQuery]);

  const runCommand = useCallback(
    async (cmd: ConveyorCommand) => {
      setFeedback(null);
      try {
        const message = await command.mutateAsync({ command: cmd });
        setFeedback({ ok: true, message });
      } catch (error) {
        // 503 = broker mati; backend sengaja tidak pura-pura sukses.
        setFeedback({
          ok: false,
          message: error instanceof ApiError ? error.message : "Gagal mengirim command.",
        });
      }
    },
    [command],
  );

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      {/* Kondisi line */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.sectionTitle}>Kondisi Line</Text>
          {statusQuery.isLoading && !status ? (
            <ActivityIndicator size="small" color="#2563eb" />
          ) : (
            <View style={styles.connRow}>
              <View
                style={[
                  styles.dot,
                  { backgroundColor: status?.broker_connected ? "#16a34a" : "#9ca3af" },
                ]}
              />
              <Text
                style={[
                  styles.connText,
                  { color: status?.broker_connected ? "#16a34a" : "#6b7280" },
                ]}
              >
                {status?.broker_connected ? "Broker terhubung" : "Broker terputus"}
              </Text>
            </View>
          )}
        </View>

        {statusQuery.isError ? (
          <ErrorState error={statusQuery.error} onRetry={() => void statusQuery.refetch()} />
        ) : status ? (
          <>
            <View style={styles.countRow}>
              {status.events.map((event) => (
                <View key={event} style={styles.countBox}>
                  <Text style={styles.countValue}>{status.counts[event] ?? 0}</Text>
                  <Text style={styles.countLabel}>{EVENT_LABELS[event]}</Text>
                </View>
              ))}
              <View style={styles.countBox}>
                <Text style={styles.countValue}>{status.total_alerts}</Text>
                <Text style={styles.countLabel}>Total</Text>
              </View>
            </View>
            <Text style={styles.windowNote}>
              Hitungan {status.window_hours} jam terakhir
            </Text>

            {status.latest_alert ? (
              <View style={styles.latestBox}>
                <Text style={styles.latestLabel}>Anomali terakhir</Text>
                <AlertRow alert={status.latest_alert} />
              </View>
            ) : null}
          </>
        ) : null}
      </View>

      {/* Kontrol */}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>Kontrol Conveyor</Text>
        <View style={styles.controlRow}>
          {CONTROLS.map((ctrl) => (
            <Pressable
              key={ctrl.key}
              style={[
                styles.controlBtn,
                { backgroundColor: ctrl.color },
                command.isPending && styles.controlBtnDisabled,
              ]}
              onPress={() => runCommand(ctrl.key)}
              disabled={command.isPending}
            >
              {command.isPending && command.variables?.command === ctrl.key ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <Ionicons name={ctrl.icon} size={18} color="#fff" />
                  <Text style={styles.controlText}>{ctrl.label}</Text>
                </>
              )}
            </Pressable>
          ))}
        </View>

        {feedback ? (
          <View
            style={[
              styles.feedbackBox,
              feedback.ok ? styles.feedbackOk : styles.feedbackErr,
            ]}
          >
            <Ionicons
              name={feedback.ok ? "checkmark-circle-outline" : "alert-circle-outline"}
              size={16}
              color={feedback.ok ? "#15803d" : "#b91c1c"}
            />
            <Text
              style={[
                styles.feedbackText,
                { color: feedback.ok ? "#15803d" : "#b91c1c" },
              ]}
            >
              {feedback.message}
            </Text>
          </View>
        ) : null}
      </View>

      {/* Riwayat anomali */}
      <Text style={styles.sectionTitle}>Riwayat Anomali</Text>

      <View style={styles.filterRow}>
        {FILTERS.map((f) => {
          const active = f.key === filter;
          return (
            <Pressable
              key={f.key || "all"}
              onPress={() => setFilter(f.key)}
              style={[styles.chip, active && styles.chipActive]}
            >
              <Text style={[styles.chipText, active && styles.chipTextActive]}>
                {f.label}
              </Text>
            </Pressable>
          );
        })}
      </View>

      {alertsQuery.isLoading ? (
        <LoadingState label="Memuat anomali..." />
      ) : alertsQuery.isError ? (
        <ErrorState error={alertsQuery.error} onRetry={() => void alertsQuery.refetch()} />
      ) : alerts.length === 0 ? (
        <EmptyState icon="checkmark-circle-outline" title="Tidak ada anomali" />
      ) : (
        <View style={styles.card}>
          {alerts.map((alert, idx) => (
            <View
              key={alert.id}
              style={idx < alerts.length - 1 ? styles.alertDivider : undefined}
            >
              <AlertRow alert={alert} />
            </View>
          ))}
        </View>
      )}
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
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontFamily: "Poppins_600SemiBold",
    color: "#111827",
    marginBottom: 12,
  },
  connRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  connText: { fontSize: 12, fontFamily: "Poppins_500Medium" },
  countRow: { flexDirection: "row", gap: 10 },
  countBox: {
    flex: 1,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
  },
  countValue: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#111827" },
  countLabel: { fontSize: 11, fontFamily: "Poppins_400Regular", color: "#6b7280" },
  windowNote: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#9ca3af",
    marginTop: 8,
  },
  latestBox: { marginTop: 14, borderTopWidth: 1, borderTopColor: "#f3f4f6", paddingTop: 12 },
  latestLabel: {
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#6b7280",
    marginBottom: 8,
  },
  controlRow: { flexDirection: "row", gap: 10 },
  controlBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    borderRadius: 12,
    paddingVertical: 14,
  },
  controlBtnDisabled: { opacity: 0.6 },
  controlText: { color: "#fff", fontSize: 14, fontFamily: "Poppins_600SemiBold" },
  feedbackBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
  },
  feedbackOk: { backgroundColor: "#f0fdf4" },
  feedbackErr: { backgroundColor: "#fef2f2" },
  feedbackText: { flex: 1, fontSize: 13, fontFamily: "Poppins_500Medium" },
  filterRow: { flexDirection: "row", gap: 8, marginBottom: 12 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 99,
    backgroundColor: "#f3f4f6",
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  chipActive: { backgroundColor: "#eff6ff", borderColor: "#2563eb" },
  chipText: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#6b7280" },
  chipTextActive: { color: "#2563eb", fontFamily: "Poppins_600SemiBold" },
  alertRow: { flexDirection: "row", gap: 12, alignItems: "flex-start", paddingVertical: 10 },
  alertDivider: { borderBottomWidth: 1, borderBottomColor: "#f3f4f6" },
  alertIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  alertTitle: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: "#111827" },
  alertMessage: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#6b7280",
    marginTop: 2,
  },
  alertTime: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#9ca3af",
    marginTop: 4,
  },
});
