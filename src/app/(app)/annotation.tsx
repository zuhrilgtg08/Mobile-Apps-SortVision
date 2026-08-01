import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StatusBadge from "@/components/StatusBadge";
import {
  useAnnotationQueue,
  useAnnotationStats,
  useApproveAnnotation,
  useRelabelAnnotation,
} from "@/hooks/useAnnotations";
import {
  type AnnotationQueueItem,
  type DetectionStatus,
} from "@/services/annotationApi";
import { ApiError } from "@/services/api";

/**
 * Sama dengan `Detection::TRAINABLE_STATUSES` di backend — hanya kelas visual
 * ini yang bisa dipilih sebagai koreksi label. Status workflow ("returned",
 * "recheck") sengaja tidak muncul di sini.
 */
const TRAINABLE_CLASSES: { key: DetectionStatus; label: string }[] = [
  { key: "passed", label: "Passed" },
  { key: "unreadable", label: "QR Unreadable" },
  { key: "damaged", label: "Damaged" },
  { key: "scratched", label: "Scratched" },
];

function detectionTitle(item: AnnotationQueueItem): string {
  return item.code ?? item.product?.name ?? `Deteksi #${item.id}`;
}

function QueueCard({ item }: { item: AnnotationQueueItem }) {
  const [pickingClass, setPickingClass] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const approve = useApproveAnnotation();
  const relabel = useRelabelAnnotation();

  const busy = approve.isPending || relabel.isPending;

  const onApprove = useCallback(async () => {
    setFeedback(null);
    try {
      await approve.mutateAsync(item.id);
    } catch (error) {
      setFeedback(error instanceof ApiError ? error.message : "Gagal menyetujui label.");
    }
  }, [approve, item.id]);

  const onRelabel = useCallback(
    async (label: DetectionStatus) => {
      setFeedback(null);
      try {
        await relabel.mutateAsync({ detectionId: item.id, label });
        setPickingClass(false);
      } catch (error) {
        setFeedback(error instanceof ApiError ? error.message : "Gagal memperbarui label.");
      }
    },
    [relabel, item.id],
  );

  return (
    <View style={styles.card}>
      <View style={styles.cardRow}>
        <View style={styles.cardImage}>
          {item.image_url ? (
            <Image source={{ uri: item.image_url }} style={styles.cardImagePhoto} resizeMode="cover" />
          ) : (
            <Ionicons name="image-outline" size={28} color="#9ca3af" />
          )}
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle} numberOfLines={1}>{detectionTitle(item)}</Text>
          <Text style={styles.cardMeta} numberOfLines={1}>
            {item.product?.name ?? "Tanpa produk"}
          </Text>
          <StatusBadge status={item.status} />
        </View>
        {!pickingClass && (
          <View style={styles.cardActions}>
            <Pressable style={styles.approveBtn} onPress={onApprove} disabled={busy}>
              {approve.isPending ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Ionicons name="checkmark" size={20} color="#fff" />
              )}
            </Pressable>
            <Pressable
              style={styles.relabelBtn}
              onPress={() => setPickingClass(true)}
              disabled={busy}
            >
              <Ionicons name="pencil" size={18} color="#fff" />
            </Pressable>
          </View>
        )}
      </View>

      {pickingClass && (
        <View style={styles.classPicker}>
          <Text style={styles.classPickerLabel}>Koreksi ke kelas:</Text>
          <View style={styles.classChips}>
            {TRAINABLE_CLASSES.map((cls) => (
              <Pressable
                key={cls.key}
                style={styles.classChip}
                onPress={() => onRelabel(cls.key)}
                disabled={busy}
              >
                {relabel.isPending && relabel.variables?.label === cls.key ? (
                  <ActivityIndicator size="small" color="#2563eb" />
                ) : (
                  <Text style={styles.classChipText}>{cls.label}</Text>
                )}
              </Pressable>
            ))}
          </View>
          <Pressable onPress={() => setPickingClass(false)} disabled={busy}>
            <Text style={styles.cancelText}>Batal</Text>
          </Pressable>
        </View>
      )}

      {feedback ? <Text style={styles.errorText}>{feedback}</Text> : null}
    </View>
  );
}

export default function AnnotationScreen() {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const statsQuery = useAnnotationStats();
  const queueQuery = useAnnotationQueue();

  const onRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await Promise.all([statsQuery.refetch(), queueQuery.refetch()]);
    } finally {
      setIsRefreshing(false);
    }
  }, [statsQuery, queueQuery]);

  const items = queueQuery.data?.data ?? [];

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
      refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={onRefresh} />}
    >
      <View style={styles.statsRow}>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{statsQuery.data?.pending ?? "—"}</Text>
          <Text style={styles.statLabel}>Menunggu label</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statValue}>{statsQuery.data?.labelled ?? "—"}</Text>
          <Text style={styles.statLabel}>Sudah dilabeli</Text>
        </View>
      </View>

      {queueQuery.isError ? (
        <Text style={styles.empty}>
          {queueQuery.error instanceof ApiError ? queueQuery.error.message : "Gagal memuat antrian."}
        </Text>
      ) : queueQuery.isLoading ? (
        <ActivityIndicator size="small" color="#2563eb" style={{ marginTop: 24 }} />
      ) : items.length === 0 ? (
        <Text style={styles.empty}>Antrian labelling kosong. Semua deteksi sudah dilabeli.</Text>
      ) : (
        items.map((item) => <QueueCard key={item.id} item={item} />)
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statCard: {
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
  statValue: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#111827" },
  statLabel: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#6b7280", marginTop: 2 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  cardImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
    overflow: "hidden",
  },
  cardImagePhoto: { width: "100%", height: "100%" },
  cardBody: { flex: 1, gap: 4 },
  cardTitle: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#111827" },
  cardMeta: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#6b7280" },
  cardActions: { flexDirection: "row", gap: 6 },
  approveBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#16a34a",
    justifyContent: "center",
    alignItems: "center",
  },
  relabelBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  classPicker: { marginTop: 12, gap: 8 },
  classPickerLabel: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#6b7280" },
  classChips: { flexDirection: "row", flexWrap: "wrap", gap: 6 },
  classChip: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    backgroundColor: "#eff6ff",
    minWidth: 64,
    alignItems: "center",
  },
  classChipText: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#2563eb" },
  cancelText: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#9ca3af" },
  errorText: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#b91c1c",
    marginTop: 8,
  },
  empty: {
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#9ca3af",
    paddingVertical: 24,
    textAlign: "center",
  },
});
