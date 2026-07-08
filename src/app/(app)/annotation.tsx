import { useState } from "react";
import { View, Text, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StatusBadge from "@/components/StatusBadge";

type Annotation = {
  id: number;
  product: string;
  image: string;
  status: "Pending" | "Approved" | "Rejected";
  submittedBy: string;
  date: string;
};

const MOCK_ANNOTATIONS: Annotation[] = [
  { id: 1, product: "Yogurt Strawberry #001", image: "IMG-001", status: "Pending", submittedBy: "Operator", date: "2026-07-08" },
  { id: 2, product: "Susu UHT Coklat #002", image: "IMG-002", status: "Pending", submittedBy: "Operator", date: "2026-07-08" },
  { id: 3, product: "Keju Cheddar #003", image: "IMG-003", status: "Approved", submittedBy: "Supervisor", date: "2026-07-07" },
  { id: 4, product: "Yogurt Blueberry #004", image: "IMG-004", status: "Rejected", submittedBy: "Supervisor", date: "2026-07-07" },
  { id: 5, product: "Susu Kedelai #005", image: "IMG-005", status: "Pending", submittedBy: "Operator", date: "2026-07-06" },
];

export default function AnnotationScreen() {
  const [activeTab, setActiveTab] = useState<"Pending" | "Approved" | "Rejected">("Pending");

  const filtered = MOCK_ANNOTATIONS.filter((a) => a.status === activeTab);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.tabs}>
        {(["Pending", "Approved", "Rejected"] as const).map((tab) => {
          const count = MOCK_ANNOTATIONS.filter((a) => a.status === tab).length;
          return (
            <Pressable
              key={tab}
              style={[styles.tab, activeTab === tab && styles.tabActive]}
              onPress={() => setActiveTab(tab)}
            >
              <Text style={[styles.tabText, activeTab === tab && styles.tabTextActive]}>
                {tab} ({count})
              </Text>
            </Pressable>
          );
        })}
      </View>

      {filtered.map((ann) => (
        <View key={ann.id} style={styles.card}>
          <View style={styles.cardImage}>
            <Ionicons name="image-outline" size={32} color="#9ca3af" />
          </View>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{ann.product}</Text>
            <Text style={styles.cardMeta}>{ann.submittedBy} • {ann.date}</Text>
            <StatusBadge status={ann.status} />
          </View>
          {ann.status === "Pending" && (
            <View style={styles.cardActions}>
              <Pressable style={styles.approveBtn}>
                <Ionicons name="checkmark" size={20} color="#fff" />
              </Pressable>
              <Pressable style={styles.rejectBtn}>
                <Ionicons name="close" size={20} color="#fff" />
              </Pressable>
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
  tabs: {
    flexDirection: "row",
    backgroundColor: "#f3f4f6",
    borderRadius: 14,
    padding: 4,
    marginBottom: 16,
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: "center",
    borderRadius: 12,
  },
  tabActive: { backgroundColor: "#fff", shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  tabText: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "#6b7280" },
  tabTextActive: { color: "#111827", fontFamily: "Poppins_600SemiBold" },
  card: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    marginBottom: 8,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardImage: {
    width: 52,
    height: 52,
    borderRadius: 12,
    backgroundColor: "#f9fafb",
    justifyContent: "center",
    alignItems: "center",
  },
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
  rejectBtn: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: "#dc2626",
    justifyContent: "center",
    alignItems: "center",
  },
});
