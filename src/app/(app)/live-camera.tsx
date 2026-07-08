import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StatusBadge from "@/components/StatusBadge";

const CAMERAS = [
  { id: 1, name: "ICAM-300 - Line 1", status: "Active", detections: 1248, lastSeen: "1 detik lalu" },
  { id: 2, name: "ICAM-300 - Line 2", status: "Active", detections: 982, lastSeen: "3 detik lalu" },
  { id: 3, name: "Webcam - QC Station", status: "Active", detections: 456, lastSeen: "5 detik lalu" },
  { id: 4, name: "ICAM-300 - Line 3", status: "Idle", detections: 0, lastSeen: "2 jam lalu" },
];

export default function LiveCameraScreen() {
  const [selectedCamera, setSelectedCamera] = useState<number | null>(1);
  const [streaming, setStreaming] = useState(false);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {selectedCamera && (
        <View style={styles.feedCard}>
          <View style={styles.feedHeader}>
            <Text style={styles.feedTitle}>{CAMERAS.find((c) => c.id === selectedCamera)?.name}</Text>
            <Pressable
              style={[styles.streamBtn, streaming && { backgroundColor: "#dc2626" }]}
              onPress={() => setStreaming(!streaming)}
            >
              <Ionicons name={streaming ? "stop" : "play"} size={18} color="#fff" />
              <Text style={styles.streamBtnText}>{streaming ? "Stop" : "Live"}</Text>
            </Pressable>
          </View>
          <View style={styles.feedPlaceholder}>
            <Ionicons name="videocam-outline" size={48} color={streaming ? "#2563eb" : "#d1d5db"} />
            <Text style={styles.feedPlaceholderText}>
              {streaming ? "Streaming aktif - kamera mengirim frame" : "Tekan Live untuk memulai streaming"}
            </Text>
          </View>
          {streaming && (
            <View style={styles.detectionOverlay}>
              <Text style={styles.detectionLabel}>Deteksi: Product #YOG-001</Text>
              <StatusBadge status="OK" />
            </View>
          )}
        </View>
      )}

      <Text style={styles.sectionTitle}>Daftar Kamera</Text>
      {CAMERAS.map((cam) => (
        <Pressable
          key={cam.id}
          style={[styles.camCard, selectedCamera === cam.id && styles.camCardActive]}
          onPress={() => setSelectedCamera(cam.id)}
        >
          <View style={styles.camLeft}>
            <View style={[styles.camIcon, selectedCamera === cam.id && styles.camIconActive]}>
              <Ionicons name="videocam-outline" size={22} color={selectedCamera === cam.id ? "#fff" : "#2563eb"} />
            </View>
            <View>
              <Text style={styles.camName}>{cam.name}</Text>
              <Text style={styles.camMeta}>{cam.detections} deteksi • {cam.lastSeen}</Text>
            </View>
          </View>
          <StatusBadge status={cam.status} />
        </Pressable>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  feedCard: {
    backgroundColor: "#111827",
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 20,
  },
  feedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
  },
  feedTitle: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#fff" },
  streamBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563eb",
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 8,
  },
  streamBtnText: { fontSize: 12, fontFamily: "Poppins_600SemiBold", color: "#fff" },
  feedPlaceholder: {
    height: 200,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#1f2937",
    gap: 12,
  },
  feedPlaceholderText: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#6b7280", textAlign: "center" },
  detectionOverlay: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(0,0,0,0.5)",
  },
  detectionLabel: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "#fff" },
  sectionTitle: { fontSize: 16, fontFamily: "Poppins_600SemiBold", color: "#111827", marginBottom: 12 },
  camCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  camCardActive: { borderColor: "#2563eb" },
  camLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  camIcon: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  camIconActive: { backgroundColor: "#2563eb" },
  camName: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#111827" },
  camMeta: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#6b7280", marginTop: 2 },
});
