import { EmptyState, ErrorState, LoadingState, Paginator } from "@/components/QueryStates";
import { useLogFilterOptions, useLogs } from "@/hooks/useLogs";
import { type LogLevel } from "@/services/logApi";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const LEVEL_ICONS: Record<string, keyof typeof Ionicons.glyphMap> = {
  info: "information-circle-outline",
  warning: "warning-outline",
  error: "alert-circle-outline",
  critical: "skull-outline",
};

/** Backend mengirim nama warna Tailwind; petakan ke hex yang dipakai app. */
const LEVEL_COLORS: Record<string, string> = {
  blue: "#2563eb",
  amber: "#ca8a04",
  red: "#dc2626",
  rose: "#e11d48",
  gray: "#6b7280",
};

function formatTimestamp(iso: string | null): string {
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

export default function LogsScreen() {
  const [level, setLevel] = useState<LogLevel | "">("");
  const [page, setPage] = useState(1);

  const query = useLogs({ level, page });
  const options = useLogFilterOptions();

  const logs = query.data?.data ?? [];
  const meta = query.data?.meta;
  const levels = options.data?.levels ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.filters}>
        <Pressable
          style={[styles.filterChip, level === "" && styles.filterChipActive]}
          onPress={() => {
            setLevel("");
            setPage(1);
          }}
        >
          <Text style={[styles.filterText, level === "" && styles.filterTextActive]}>
            Semua
          </Text>
        </Pressable>

        {levels.map((option) => (
          <Pressable
            key={option.key}
            style={[styles.filterChip, level === option.key && styles.filterChipActive]}
            onPress={() => {
              setLevel(option.key);
              setPage(1);
            }}
          >
            <Text
              style={[
                styles.filterText,
                level === option.key && styles.filterTextActive,
              ]}
            >
              {option.key.charAt(0).toUpperCase() + option.key.slice(1)}
            </Text>
          </Pressable>
        ))}

        {query.isFetching && !query.isLoading ? (
          <ActivityIndicator size="small" color="#9ca3af" />
        ) : null}
      </View>

      {query.isLoading ? (
        <LoadingState label="Memuat log..." />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : logs.length === 0 ? (
        <EmptyState
          icon="document-text-outline"
          title="Tidak ada log"
          hint={level ? `Belum ada log level "${level}".` : undefined}
        />
      ) : (
        <>
          {logs.map((log) => {
            const color = LEVEL_COLORS[log.level_color] ?? LEVEL_COLORS.gray;
            return (
              <View key={log.id} style={styles.logCard}>
                <View style={[styles.iconWrap, { backgroundColor: color + "20" }]}>
                  <Ionicons
                    name={LEVEL_ICONS[log.level] ?? "ellipse-outline"}
                    size={20}
                    color={color}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.message}>{log.message}</Text>
                  <View style={styles.metaRow}>
                    <Text style={styles.metaText}>{log.source}</Text>
                    <Text style={styles.metaDot}>·</Text>
                    <Text style={styles.metaText}>
                      {formatTimestamp(log.logged_at)}
                    </Text>
                  </View>
                </View>
              </View>
            );
          })}

          {meta ? (
            <Paginator
              page={meta.current_page}
              lastPage={meta.last_page}
              total={meta.total}
              onChange={setPage}
            />
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  filters: {
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 16,
  },
  filterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: "#fff",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  filterChipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  filterText: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "#6b7280" },
  filterTextActive: { color: "#fff" },
  logCard: {
    flexDirection: "row",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  message: {
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#111827",
    lineHeight: 20,
  },
  metaRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  metaText: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#6b7280" },
  metaDot: { fontSize: 12, color: "#d1d5db" },
});
