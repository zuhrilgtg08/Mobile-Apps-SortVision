import DetectionOverlay from "@/components/DetectionOverlay";
import { EmptyState, ErrorState, LoadingState } from "@/components/QueryStates";
import StatusBadge from "@/components/StatusBadge";
import {
  DEFAULT_FRAME_RATE,
  FRAME_RATES,
  useCameras,
  useCameraStatus,
  useCameraStream,
} from "@/hooks/useCameraStream";
import { useDetections } from "@/hooks/useDetections";
import { type Camera } from "@/services/cameraApi";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "expo-image";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

/** Rasio 4:3 mengikuti frame 640x480 yang dihasilkan ml-service. */
const FEED_ASPECT = 4 / 3;

function relativeTime(iso: string | null): string {
  if (!iso) return "-";
  const then = new Date(iso).getTime();
  if (Number.isNaN(then)) return "-";

  const seconds = Math.max(0, Math.round((Date.now() - then) / 1000));
  if (seconds < 60) return `${seconds} detik lalu`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} menit lalu`;
  if (seconds < 86400) return `${Math.round(seconds / 3600)} jam lalu`;
  return `${Math.round(seconds / 86400)} hari lalu`;
}

export default function LiveCameraScreen() {
  const [selectedCamera, setSelectedCamera] = useState<Camera | null>(null);
  const [streaming, setStreaming] = useState(false);
  const [fps, setFps] = useState<number>(DEFAULT_FRAME_RATE);
  const [feedSize, setFeedSize] = useState({ width: 0, height: 0 });

  const camerasQuery = useCameras();
  const statusQuery = useCameraStatus(streaming);
  const { source, error: frameError } = useCameraStream(streaming, fps);

  const cameras = camerasQuery.data?.data ?? [];
  const active = selectedCamera ?? cameras[0] ?? null;

  // Deteksi terbaru untuk kamera aktif — sumber kotak overlay. Disegarkan
  // seirama feed saat streaming, dan berhenti total saat di-pause.
  const detectionsQuery = useDetections(
    { camera: active?.name, per_page: 10 },
    streaming ? Math.max(500, Math.round(1000 / fps)) : false,
  );
  const detections = detectionsQuery.data ?? [];
  const latest = detections[0];

  const status = statusQuery.data;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {camerasQuery.isLoading ? (
        <LoadingState label="Memuat kamera..." />
      ) : camerasQuery.isError ? (
        <ErrorState
          error={camerasQuery.error}
          onRetry={() => void camerasQuery.refetch()}
        />
      ) : cameras.length === 0 ? (
        <EmptyState
          icon="videocam-off-outline"
          title="Belum ada kamera"
          hint="Tambahkan kamera dari dashboard web terlebih dahulu."
        />
      ) : (
        <>
          {active ? (
            <View style={styles.feedCard}>
              <View style={styles.feedHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.feedTitle}>{active.name}</Text>
                  <Text style={styles.feedSubtitle}>
                    {active.conveyor ?? "Tanpa conveyor"} ·{" "}
                    {active.source_kind === "rtsp" ? "RTSP" : "Simulator"}
                  </Text>
                </View>
                <Pressable
                  style={[styles.streamBtn, streaming && styles.streamBtnStop]}
                  onPress={() => setStreaming((s) => !s)}
                >
                  <Ionicons
                    name={streaming ? "stop" : "play"}
                    size={18}
                    color="#fff"
                  />
                  <Text style={styles.streamBtnText}>
                    {streaming ? "Stop" : "Live"}
                  </Text>
                </Pressable>
              </View>

              <View
                style={[styles.feedFrame, { aspectRatio: FEED_ASPECT }]}
                onLayout={(e) =>
                  setFeedSize({
                    width: e.nativeEvent.layout.width,
                    height: e.nativeEvent.layout.height,
                  })
                }
              >
                {streaming && source ? (
                  <>
                    <Image
                      source={source}
                      style={StyleSheet.absoluteFill}
                      contentFit="contain"
                      // Frame berganti tiap tick; cache akan membekukan gambar.
                      cachePolicy="none"
                      transition={0}
                    />
                    <DetectionOverlay
                      detections={detections}
                      width={feedSize.width}
                      height={feedSize.height}
                    />
                  </>
                ) : (
                  <View style={styles.feedPlaceholder}>
                    <Ionicons name="videocam-outline" size={48} color="#d1d5db" />
                    <Text style={styles.feedPlaceholderText}>
                      Tekan Live untuk memulai
                    </Text>
                  </View>
                )}

                {streaming ? (
                  <View style={styles.liveBadge}>
                    <View style={styles.liveDot} />
                    <Text style={styles.liveText}>LIVE</Text>
                  </View>
                ) : null}
              </View>

              {streaming ? (
                <>
                  <View style={styles.statusRow}>
                    {statusQuery.isLoading && !status ? (
                      <ActivityIndicator size="small" color="#9ca3af" />
                    ) : status ? (
                      <Text style={styles.statusText}>
                        {status.service_reachable
                          ? `${status.mode} · ${status.fps.toFixed(1)} fps sumber${
                              status.connected ? "" : " (belum terhubung)"
                            }`
                          : "ML service tidak terjangkau"}
                      </Text>
                    ) : null}

                    <View style={styles.fpsRow}>
                      {FRAME_RATES.map((rate) => (
                        <Pressable
                          key={rate}
                          style={[styles.fpsChip, fps === rate && styles.fpsChipActive]}
                          onPress={() => setFps(rate)}
                        >
                          <Text
                            style={[
                              styles.fpsText,
                              fps === rate && styles.fpsTextActive,
                            ]}
                          >
                            {rate}fps
                          </Text>
                        </Pressable>
                      ))}
                    </View>
                  </View>

                  {frameError ? (
                    <Text style={styles.frameError}>{frameError}</Text>
                  ) : null}

                  {latest ? (
                    <View style={styles.detectionOverlay}>
                      <Text style={styles.detectionLabel} numberOfLines={1}>
                        {latest.label ?? latest.code ?? "Deteksi"} ·{" "}
                        {latest.confidence !== null
                          ? `${Math.round(Number(latest.confidence))}%`
                          : "-"}
                      </Text>
                      <StatusBadge
                        status={latest.status_label ?? latest.status ?? "-"}
                      />
                    </View>
                  ) : null}
                </>
              ) : null}
            </View>
          ) : null}

          <Text style={styles.sectionTitle}>Daftar Kamera</Text>
          {cameras.map((camera) => {
            const isActive = active?.id === camera.id;
            return (
              <Pressable
                key={camera.id}
                style={[styles.camCard, isActive && styles.camCardActive]}
                onPress={() => setSelectedCamera(camera)}
              >
                <View style={styles.camLeft}>
                  <View style={[styles.camIcon, isActive && styles.camIconActive]}>
                    <Ionicons
                      name="videocam-outline"
                      size={22}
                      color={isActive ? "#fff" : "#2563eb"}
                    />
                  </View>
                  <View>
                    <Text style={styles.camName}>{camera.name}</Text>
                    <Text style={styles.camMeta}>
                      {camera.conveyor ?? "Tanpa conveyor"} ·{" "}
                      {camera.source_kind === "rtsp" ? "RTSP" : "Simulator"}
                    </Text>
                  </View>
                </View>
                <View
                  style={[
                    styles.camDot,
                    { backgroundColor: camera.is_active ? "#16a34a" : "#d1d5db" },
                  ]}
                />
              </Pressable>
            );
          })}

          {latest ? (
            <Text style={styles.lastSeen}>
              Deteksi terakhir {relativeTime(latest.detected_at)}
            </Text>
          ) : null}
        </>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  feedCard: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 20,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  feedHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  feedTitle: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#111827" },
  feedSubtitle: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#6b7280" },
  streamBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#2563eb",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  streamBtnStop: { backgroundColor: "#dc2626" },
  streamBtnText: { color: "#fff", fontSize: 13, fontFamily: "Poppins_600SemiBold" },
  feedFrame: {
    width: "100%",
    backgroundColor: "#111827",
    borderRadius: 12,
    overflow: "hidden",
    justifyContent: "center",
    alignItems: "center",
  },
  feedPlaceholder: { alignItems: "center", gap: 10 },
  feedPlaceholderText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#9ca3af",
  },
  liveBadge: {
    position: "absolute",
    top: 10,
    left: 10,
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(0,0,0,0.6)",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  liveDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: "#ef4444" },
  liveText: { color: "#fff", fontSize: 10, fontFamily: "Poppins_700Bold" },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    flexWrap: "wrap",
    gap: 8,
  },
  statusText: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#6b7280" },
  fpsRow: { flexDirection: "row", gap: 6 },
  fpsChip: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  fpsChipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  fpsText: { fontSize: 11, fontFamily: "Poppins_500Medium", color: "#6b7280" },
  fpsTextActive: { color: "#fff" },
  frameError: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#dc2626" },
  detectionOverlay: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 10,
    backgroundColor: "#f9fafb",
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  detectionLabel: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#111827",
  },
  sectionTitle: {
    fontSize: 14,
    fontFamily: "Poppins_600SemiBold",
    color: "#111827",
    marginBottom: 10,
  },
  camCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: "transparent",
  },
  camCardActive: { borderColor: "#2563eb" },
  camLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  camIcon: {
    width: 42,
    height: 42,
    borderRadius: 13,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  camIconActive: { backgroundColor: "#2563eb" },
  camName: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#111827" },
  camMeta: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#6b7280" },
  camDot: { width: 10, height: 10, borderRadius: 5 },
  lastSeen: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 8,
  },
});
