import { View, Text, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StatusBadge from "@/components/StatusBadge";

const RUNS = [
  { id: 1, model: "YOLOv8n v2.1", status: "Completed", accuracy: "96.8%", epochs: 50, date: "2026-07-05" },
  { id: 2, model: "YOLOv8n v2.0", status: "Completed", accuracy: "95.2%", epochs: 50, date: "2026-06-28" },
  { id: 3, model: "YOLOv8s v1.0", status: "Completed", accuracy: "94.1%", epochs: 40, date: "2026-06-20" },
  { id: 4, model: "YOLOv8n v1.0", status: "Failed", accuracy: "-", epochs: 12, date: "2026-06-15" },
];

export default function TrainingScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.statsRow}>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>3</Text>
          <Text style={styles.statLabel}>Completed</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>1</Text>
          <Text style={styles.statLabel}>Failed</Text>
        </View>
        <View style={styles.statBox}>
          <Text style={styles.statValue}>96.8%</Text>
          <Text style={styles.statLabel}>Best Accuracy</Text>
        </View>
      </View>

      <View style={styles.chartCard}>
        <Text style={styles.sectionTitle}>Akurasi per Epoch</Text>
        <View style={styles.chartPlaceholder}>
          <Ionicons name="stats-chart-outline" size={48} color="#d1d5db" />
          <Text style={styles.chartText}>Grafik akurasi training</Text>
        </View>
      </View>

      <View style={styles.datasetCard}>
        <Text style={styles.sectionTitle}>Dataset Distribution</Text>
        <View style={styles.distRow}>
          <Text style={styles.distLabel}>Training</Text>
          <View style={styles.distBarBg}>
            <View style={[styles.distBar, { width: "70%", backgroundColor: "#2563eb" }]} />
          </View>
          <Text style={styles.distValue}>1,400</Text>
        </View>
        <View style={styles.distRow}>
          <Text style={styles.distLabel}>Validation</Text>
          <View style={styles.distBarBg}>
            <View style={[styles.distBar, { width: "20%", backgroundColor: "#16a34a" }]} />
          </View>
          <Text style={styles.distValue}>400</Text>
        </View>
        <View style={styles.distRow}>
          <Text style={styles.distLabel}>Test</Text>
          <View style={styles.distBarBg}>
            <View style={[styles.distBar, { width: "10%", backgroundColor: "#ca8a04" }]} />
          </View>
          <Text style={styles.distValue}>200</Text>
        </View>
      </View>

      <Text style={styles.sectionTitle}>Run History</Text>
      {RUNS.map((run) => (
        <View key={run.id} style={styles.runCard}>
          <View style={styles.runHeader}>
            <View>
              <Text style={styles.runModel}>{run.model}</Text>
              <Text style={styles.runDate}>{run.date} • {run.epochs} epochs</Text>
            </View>
            <StatusBadge status={run.status} />
          </View>
          {run.accuracy !== "-" && (
            <View style={styles.runFooter}>
              <Text style={styles.runAccuracy}>Accuracy: {run.accuracy}</Text>
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
  statsRow: { flexDirection: "row", gap: 12, marginBottom: 16 },
  statBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: 14,
    padding: 14,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  statValue: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#111827" },
  statLabel: { fontSize: 11, fontFamily: "Poppins_400Regular", color: "#6b7280", marginTop: 2 },
  chartCard: {
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
  sectionTitle: { fontSize: 16, fontFamily: "Poppins_600SemiBold", color: "#111827", marginBottom: 12 },
  chartPlaceholder: {
    height: 120,
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  chartText: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#9ca3af" },
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
  distRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 10 },
  distLabel: { width: 80, fontSize: 13, fontFamily: "Poppins_500Medium", color: "#374151" },
  distBarBg: { flex: 1, height: 20, backgroundColor: "#f3f4f6", borderRadius: 10, overflow: "hidden" },
  distBar: { height: "100%", borderRadius: 10 },
  distValue: { width: 40, fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#374151", textAlign: "right" },
  runCard: {
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
  runHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  runModel: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#111827" },
  runDate: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#6b7280", marginTop: 2 },
  runFooter: { marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  runAccuracy: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "#16a34a" },
});
