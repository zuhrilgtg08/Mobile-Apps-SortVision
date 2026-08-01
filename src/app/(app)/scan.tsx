import { ApiError } from "@/services/api";
import { scanQr, type ScanResult } from "@/services/scanApi";
import StatusBadge from "@/components/StatusBadge";
import { Ionicons } from "@expo/vector-icons";
import { CameraView, useCameraPermissions, type BarcodeScanningResult } from "expo-camera";
import { router } from "expo-router";
import { useCallback, useRef, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

function formatRelative(iso: string | null): string {
  if (!iso) return "-";
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return iso;
  const diff = Date.now() - t;
  if (diff < 0) return new Date(iso).toLocaleString();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s} detik lalu`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} menit lalu`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h} jam lalu`;
  return new Date(iso).toLocaleString();
}

/** Hasil scan yang berhasil: produk + verdict QC terakhirnya. */
function ScanResultCard({ result, onScanAgain }: { result: ScanResult; onScanAgain: () => void }) {
  const { product, latest_detection: detection } = result;

  return (
    <ScrollView contentContainerStyle={styles.resultContent}>
      <View style={styles.resultCard}>
        <View style={styles.resultHeader}>
          <View style={styles.resultImage}>
            {product.image_url ? (
              <Image source={{ uri: product.image_url }} style={styles.resultImagePhoto} resizeMode="cover" />
            ) : (
              <Ionicons name="cube-outline" size={30} color="#9ca3af" />
            )}
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.resultName}>{product.name}</Text>
            <Text style={styles.resultCode}>{product.code}</Text>
            <StatusBadge status={product.status_label} />
          </View>
        </View>

        <View style={styles.divider} />

        <Text style={styles.sectionLabel}>Verdict QC Terakhir</Text>
        {detection ? (
          <View style={styles.verdictBox}>
            <View style={styles.verdictRow}>
              <StatusBadge status={detection.status} />
              <Text style={styles.verdictTime}>{formatRelative(detection.detected_at)}</Text>
            </View>
            <Text style={styles.verdictMeta}>
              {[detection.camera, detection.conveyor].filter(Boolean).join(" • ") || "—"}
            </Text>
            {detection.confidence ? (
              <Text style={styles.verdictMeta}>Confidence: {detection.confidence}%</Text>
            ) : null}
          </View>
        ) : (
          <Text style={styles.empty}>Produk ini belum pernah melewati QC.</Text>
        )}

        <View style={styles.divider} />

        <View style={styles.metaGrid}>
          <View style={styles.metaItem}>
            <Text style={styles.metaKey}>SKU</Text>
            <Text style={styles.metaVal}>{product.sku ?? "—"}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaKey}>Stok</Text>
            <Text style={styles.metaVal}>{product.stock}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaKey}>Kategori</Text>
            <Text style={styles.metaVal}>{product.category?.name ?? "—"}</Text>
          </View>
          <View style={styles.metaItem}>
            <Text style={styles.metaKey}>Total Deteksi</Text>
            <Text style={styles.metaVal}>{product.detections_count ?? "—"}</Text>
          </View>
        </View>
      </View>

      <Pressable style={styles.primaryBtn} onPress={onScanAgain}>
        <Ionicons name="scan-outline" size={18} color="#fff" />
        <Text style={styles.primaryBtnText}>Scan Lagi</Text>
      </Pressable>

      <Pressable style={styles.secondaryBtn} onPress={() => router.push("/(app)/products")}>
        <Text style={styles.secondaryBtnText}>Buka Daftar Produk</Text>
      </Pressable>
    </ScrollView>
  );
}

export default function ScanScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isResolving, setIsResolving] = useState(false);

  /**
   * Kamera menembakkan `onBarcodeScanned` berkali-kali per detik selama QR
   * masih terlihat. Ref ini mengunci setelah tembakan pertama supaya satu QR
   * tidak memicu puluhan request — dan dipakai lewat ref, bukan state, agar
   * penguncian berlaku seketika tanpa menunggu re-render.
   */
  const lockedRef = useRef(false);

  const onBarcodeScanned = useCallback(async ({ data }: BarcodeScanningResult) => {
    if (lockedRef.current) return;
    lockedRef.current = true;

    setIsResolving(true);
    setError(null);

    try {
      setResult(await scanQr(data));
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : "Gagal membaca QR. Coba lagi.",
      );
      // Kegagalan tidak boleh mengunci kamera selamanya — QR berikutnya
      // (atau yang sama, diarahkan ulang) harus bisa dicoba.
      lockedRef.current = false;
    } finally {
      setIsResolving(false);
    }
  }, []);

  const scanAgain = useCallback(() => {
    setResult(null);
    setError(null);
    lockedRef.current = false;
  }, []);

  // Izin masih diperiksa saat pertama render.
  if (!permission) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator color="#2563eb" />
      </View>
    );
  }

  if (!permission.granted) {
    return (
      <View style={styles.centered}>
        <Ionicons name="camera-outline" size={48} color="#9ca3af" />
        <Text style={styles.permTitle}>Butuh Akses Kamera</Text>
        <Text style={styles.permText}>
          Scan QR produk memerlukan izin kamera untuk membaca kode di kemasan.
        </Text>
        {permission.canAskAgain ? (
          <Pressable style={styles.primaryBtn} onPress={requestPermission}>
            <Text style={styles.primaryBtnText}>Izinkan Kamera</Text>
          </Pressable>
        ) : (
          // Sekali ditolak permanen, dialog sistem tidak muncul lagi — satu-
          // satunya jalan adalah Pengaturan, jadi katakan itu apa adanya.
          <Text style={styles.permText}>
            Izin ditolak permanen. Aktifkan lewat Pengaturan perangkat.
          </Text>
        )}
      </View>
    );
  }

  if (result) {
    return <ScanResultCard result={result} onScanAgain={scanAgain} />;
  }

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
        onBarcodeScanned={isResolving ? undefined : onBarcodeScanned}
      />

      {/* Bingkai bidik */}
      <View style={styles.overlay} pointerEvents="none">
        <View style={styles.frame} />
        <Text style={styles.hint}>Arahkan kamera ke QR pada kemasan produk</Text>
      </View>

      {isResolving ? (
        <View style={styles.busyBox}>
          <ActivityIndicator color="#fff" />
          <Text style={styles.busyText}>Mencari produk...</Text>
        </View>
      ) : null}

      {error ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle" size={18} color="#fff" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#000" },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    gap: 12,
  },
  permTitle: { fontSize: 17, fontFamily: "Poppins_600SemiBold", color: "#111827" },
  permText: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#6b7280",
    textAlign: "center",
  },
  overlay: { flex: 1, alignItems: "center", justifyContent: "center", gap: 20 },
  frame: {
    width: 240,
    height: 240,
    borderRadius: 24,
    borderWidth: 3,
    borderColor: "rgba(255,255,255,0.9)",
    backgroundColor: "transparent",
  },
  hint: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#fff",
    textAlign: "center",
    paddingHorizontal: 32,
  },
  busyBox: {
    position: "absolute",
    bottom: 48,
    alignSelf: "center",
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(0,0,0,0.75)",
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
  },
  busyText: { color: "#fff", fontSize: 13, fontFamily: "Poppins_500Medium" },
  errorBox: {
    position: "absolute",
    bottom: 48,
    left: 24,
    right: 24,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(220,38,38,0.95)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 14,
  },
  errorText: { flex: 1, color: "#fff", fontSize: 13, fontFamily: "Poppins_500Medium" },
  resultContent: { padding: 16, paddingBottom: 32 },
  resultCard: {
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
  resultHeader: { flexDirection: "row", gap: 14, alignItems: "center" },
  resultImage: {
    width: 64,
    height: 64,
    borderRadius: 14,
    backgroundColor: "#f9fafb",
    alignItems: "center",
    justifyContent: "center",
    overflow: "hidden",
  },
  resultImagePhoto: { width: "100%", height: "100%" },
  resultName: { fontSize: 16, fontFamily: "Poppins_700Bold", color: "#111827" },
  resultCode: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#6b7280",
    marginBottom: 6,
  },
  divider: { height: 1, backgroundColor: "#f3f4f6", marginVertical: 14 },
  sectionLabel: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: "#111827",
    marginBottom: 8,
  },
  verdictBox: { gap: 6 },
  verdictRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  verdictTime: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#9ca3af" },
  verdictMeta: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#6b7280" },
  metaGrid: { flexDirection: "row", flexWrap: "wrap", rowGap: 12 },
  metaItem: { width: "50%" },
  metaKey: { fontSize: 11, fontFamily: "Poppins_400Regular", color: "#9ca3af" },
  metaVal: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: "#111827" },
  empty: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#9ca3af" },
  primaryBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontSize: 15, fontFamily: "Poppins_600SemiBold" },
  secondaryBtn: { alignItems: "center", paddingVertical: 14 },
  secondaryBtnText: { color: "#2563eb", fontSize: 14, fontFamily: "Poppins_500Medium" },
});
