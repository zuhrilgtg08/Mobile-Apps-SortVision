import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import StatusBadge from "@/components/StatusBadge";
import {
  useStartTrainingRun,
  useTrainingDataset,
  useTrainingRuns,
} from "@/hooks/useTrainingRuns";
import { type TrainingRun } from "@/services/trainingApi";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

/** Metrik disimpan backend pada skala 0–100. */
function formatMap50(value: number | null): string {
  return value === null ? "-" : `${value.toFixed(1)}%`;
}

function formatDate(iso: string | null): string {
  if (!iso) return "-";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return date.toLocaleDateString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export default function TrainingScreen() {
  const [epochs, setEpochs] = useState("5");

  const runsQuery = useTrainingRuns({ per_page: 12 });
  const datasetQuery = useTrainingDataset();
  const startRun = useStartTrainingRun();

  const runs = runsQuery.data?.data ?? [];
  const dataset = datasetQuery.data;

  const completed = runs.filter((r) => r.status === "completed");
  const failed = runs.filter((r) => r.status === "failed");
  const best = completed.reduce<number | null>(
    (acc, run) => (run.map50 !== null && (acc === null || run.map50 > acc) ? run.map50 : acc),
    null,
  );
  const activeRun = runs.find((run) => run.is_active) ?? null;

  const handleStart = async () => {
    const value = Number.parseInt(epochs, 10);
    if (Number.isNaN(value) || value < 1 || value > 20) {
      Alert.alert("Epoch tidak valid", "Masukkan angka antara 1 dan 20.");
      return;
    }

    try {
      const run = await startRun.mutateAsync(value);
      Alert.alert("Training dimulai", `${run.name} sedang diproses.`);
    } catch (error) {
      // Backend membedakan alasannya: 422 sampel kurang, 503 ML service mati,
      // 409 masih ada run berjalan. Pesannya sudah siap tampil.
      Alert.alert(
        "Tidak bisa memulai training",
        error instanceof Error ? error.message : "Coba lagi.",
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{completed.length}</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{failed.length}</Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>{formatMap50(best)}</Text>
          <Text style={styles.statLabel}>Best mAP@50</Text>
        </View>
      </View>

      {/* Kartu "mulai training" — mencerminkan pre-flight check di dashboard. */}
      <View style={styles.startCard}>
        <Text style={styles.sectionTitle}>Mulai Training Baru</Text>

        {datasetQuery.isLoading ? (
          <ActivityIndicator color="#2563eb" />
        ) : datasetQuery.isError ? (
          <ErrorState
            error={datasetQuery.error}
            onRetry={() => void datasetQuery.refetch()}
          />
        ) : dataset ? (
          <>
            <Text style={styles.datasetInfo}>
              {dataset.approved_annotations} anotasi disetujui (minimal{" "}
              {dataset.min_samples})
            </Text>

            {activeRun ? (
              <View style={styles.activeBox}>
                <ActivityIndicator size="small" color="#2563eb" />
                <Text style={styles.activeText}>
                  {activeRun.name} sedang berjalan — {activeRun.progress}% (epoch{" "}
                  {activeRun.current_epoch}/{activeRun.epochs})
                </Text>
              </View>
            ) : null}

            <View style={styles.startRow}>
              <TextInput
                style={styles.epochInput}
                value={epochs}
                onChangeText={setEpochs}
                keyboardType="number-pad"
                placeholder="Epoch"
                placeholderTextColor="#9ca3af"
              />
              <Pressable
                style={[
                  styles.startBtn,
                  (startRun.isPending || !dataset.can_start || dataset.has_active_run) &&
                    styles.startBtnDisabled,
                ]}
                onPress={handleStart}
                disabled={
                  startRun.isPending || !dataset.can_start || dataset.has_active_run
                }
              >
                {startRun.isPending ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Ionicons name="play" size={16} color="#fff" />
                    <Text style={styles.startText}>Mulai</Text>
                  </>
                )}
              </Pressable>
            </View>

            {!dataset.can_start ? (
              <Text style={styles.warnText}>
                Anotasi belum cukup. Labeli dulu di menu Annotation.
              </Text>
            ) : dataset.has_active_run ? (
              <Text style={styles.warnText}>
                Sudah ada training berjalan. Tunggu sampai selesai.
              </Text>
            ) : null}
          </>
        ) : null}
      </View>

      {dataset && dataset.per_class.length > 0 ? (
        <View style={styles.datasetCard}>
          <Text style={styles.sectionTitle}>Distribusi Dataset</Text>
          {dataset.per_class.map((cls) => {
            const max = Math.max(...dataset.per_class.map((c) => c.count), 1);
            return (
              <View key={cls.label} style={styles.distRow}>
                <Text style={styles.distLabel} numberOfLines={1}>
                  {cls.label}
                </Text>
                <View style={styles.distBarBg}>
                  <View
                    style={[
                      styles.distBar,
                      { width: `${(cls.count / max) * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.distValue}>{cls.count}</Text>
              </View>
            );
          })}
        </View>
      ) : null}

      <Text style={styles.sectionTitle}>Riwayat Training</Text>

      {runsQuery.isLoading ? (
        <LoadingState label="Memuat riwayat..." />
      ) : runsQuery.isError ? (
        <ErrorState error={runsQuery.error} onRetry={() => void runsQuery.refetch()} />
      ) : runs.length === 0 ? (
        <EmptyState icon="school-outline" title="Belum ada training" />
      ) : (
        runs.map((run: TrainingRun) => (
          <View key={run.id} style={styles.runCard}>
            <View style={{ flex: 1 }}>
              <Text style={styles.runName}>{run.name}</Text>
              <Text style={styles.runMeta}>
                {run.epochs} epoch · {formatDate(run.created_at)}
              </Text>
              {run.is_active ? (
                <View style={styles.progressBg}>
                  <View style={[styles.progressBar, { width: `${run.progress}%` }]} />
                </View>
              ) : null}
              {run.error ? (
                <Text style={styles.runError} numberOfLines={2}>
                  {run.error}
                </Text>
              ) : null}
            </View>
            <View style={styles.runRight}>
              <Text style={styles.runAccuracy}>{formatMap50(run.map50)}</Text>
              <StatusBadge status={run.status_label} />
            </View>
          </View>
        ))
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    gap: 4,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#111827" },
  statLabel: { fontSize: 11, fontFamily: "Poppins_400Regular", color: "#6b7280" },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: "#111827",
    marginBottom: 12,
  },
  startCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    gap: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  datasetInfo: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#6b7280" },
  activeBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "#eff6ff",
    borderRadius: 12,
    padding: 12,
  },
  activeText: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#2563eb",
  },
  startRow: { flexDirection: "row", gap: 10, alignItems: "center" },
  epochInput: {
    width: 90,
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: "#111827",
  },
  startBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingVertical: 14,
  },
  startBtnDisabled: { opacity: 0.5 },
  startText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#fff" },
  warnText: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#b45309" },
  datasetCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  distRow: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 10 },
  distLabel: {
    width: 80,
    fontSize: 12,
    fontFamily: "Poppins_500Medium",
    color: "#374151",
  },
  distBarBg: {
    flex: 1,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#f3f4f6",
    overflow: "hidden",
  },
  distBar: { height: 8, borderRadius: 4, backgroundColor: "#2563eb" },
  distValue: {
    width: 44,
    textAlign: "right",
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    color: "#111827",
  },
  runCard: {
    flexDirection: "row",
    alignItems: "center",
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
  runName: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#111827" },
  runMeta: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#6b7280" },
  runError: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#dc2626",
    marginTop: 4,
  },
  progressBg: {
    height: 6,
    borderRadius: 3,
    backgroundColor: "#f3f4f6",
    overflow: "hidden",
    marginTop: 6,
  },
  progressBar: { height: 6, borderRadius: 3, backgroundColor: "#2563eb" },
  runRight: { alignItems: "flex-end", gap: 6 },
  runAccuracy: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#111827" },
});
