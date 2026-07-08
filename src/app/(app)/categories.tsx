import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Modal, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";

const { width } = Dimensions.get("window");
const CARD_W = (width - 44) / 2;

type Category = {
  id: number;
  name: string;
  productCount: number;
  color: string;
};

const MOCK_CATEGORIES: Category[] = [
  { id: 1, name: "Yogurt", productCount: 12, color: "#2563eb" },
  { id: 2, name: "Susu UHT", productCount: 8, color: "#16a34a" },
  { id: 3, name: "Keju", productCount: 6, color: "#ca8a04" },
  { id: 4, name: "Susu Kedelai", productCount: 4, color: "#dc2626" },
];

export default function CategoriesScreen() {
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<Category | null>(null);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.toolbar}>
        <Text style={styles.count}>{MOCK_CATEGORIES.length} kategori</Text>
        <Pressable style={styles.addBtn} onPress={() => { setSelected(null); setModal(true); }}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {MOCK_CATEGORIES.map((cat) => (
          <Pressable key={cat.id} style={styles.card} onPress={() => { setSelected(cat); setModal(true); }}>
            <View style={[styles.iconWrap, { backgroundColor: cat.color + "20" }]}>
              <Ionicons name="layers-outline" size={28} color={cat.color} />
            </View>
            <Text style={styles.catName}>{cat.name}</Text>
            <Text style={styles.catCount}>{cat.productCount} produk</Text>
          </Pressable>
        ))}
      </View>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selected ? "Edit Kategori" : "Tambah Kategori"}</Text>
            <TextInput style={styles.input} placeholder="Nama Kategori" placeholderTextColor="#9ca3af" defaultValue={selected?.name} />
            <View style={styles.modalActions}>
              <Pressable style={styles.cancelBtn} onPress={() => setModal(false)}>
                <Text style={styles.cancelText}>Batal</Text>
              </Pressable>
              <Pressable style={styles.saveBtn} onPress={() => setModal(false)}>
                <Text style={styles.saveText}>Simpan</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  toolbar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  count: { fontSize: 14, fontFamily: "Poppins_500Medium", color: "#6b7280" },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 12 },
  card: {
    width: CARD_W,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 20,
    alignItems: "center",
    gap: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 16,
    justifyContent: "center",
    alignItems: "center",
  },
  catName: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#111827" },
  catCount: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#6b7280" },
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0,0,0,0.4)",
  },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 14,
  },
  modalTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#111827", marginBottom: 8 },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: "#111827",
  },
  modalActions: { flexDirection: "row", gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  cancelText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#6b7280" },
  saveBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#2563eb",
  },
  saveText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#fff" },
});
