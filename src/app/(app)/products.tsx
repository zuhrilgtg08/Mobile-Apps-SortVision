import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Modal, Dimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StatusBadge from "@/components/StatusBadge";

const { width } = Dimensions.get("window");
const CARD_W = (width - 44) / 2;

type Product = {
  id: number;
  name: string;
  category: string;
  status: string;
  sku: string;
};

const MOCK_PRODUCTS: Product[] = [
  { id: 1, name: "Yogurt Strawberry", category: "Yogurt", status: "Active", sku: "YOG-001" },
  { id: 2, name: "Yogurt Blueberry", category: "Yogurt", status: "Active", sku: "YOG-002" },
  { id: 3, name: "Susu UHT Coklat", category: "Susu UHT", status: "Active", sku: "UHT-001" },
  { id: 4, name: "Susu UHT Vanilla", category: "Susu UHT", status: "Inactive", sku: "UHT-002" },
  { id: 5, name: "Keju Cheddar", category: "Keju", status: "Active", sku: "KEJ-001" },
  { id: 6, name: "Keju Mozarella", category: "Keju", status: "Active", sku: "KEJ-002" },
];

export default function ProductsScreen() {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<Product | null>(null);

  const filtered = MOCK_PRODUCTS.filter(
    (p) => p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.includes(search)
  );

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#9ca3af" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari produk..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <Pressable style={styles.addBtn} onPress={() => { setSelected(null); setModal(true); }}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <View style={styles.grid}>
        {filtered.map((product) => (
          <Pressable key={product.id} style={styles.card} onPress={() => { setSelected(product); setModal(true); }}>
            <View style={styles.cardImage}>
              <Ionicons name="cube-outline" size={32} color="#2563eb" />
            </View>
            <Text style={styles.cardName}>{product.name}</Text>
            <Text style={styles.cardSku}>{product.sku}</Text>
            <Text style={styles.cardCategory}>{product.category}</Text>
            <StatusBadge status={product.status} />
          </Pressable>
        ))}
      </View>

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selected ? "Edit Produk" : "Tambah Produk"}</Text>
            <TextInput style={styles.input} placeholder="Nama Produk" placeholderTextColor="#9ca3af" defaultValue={selected?.name} />
            <TextInput style={styles.input} placeholder="SKU" placeholderTextColor="#9ca3af" defaultValue={selected?.sku} />
            <TextInput style={styles.input} placeholder="Kategori" placeholderTextColor="#9ca3af" defaultValue={selected?.category} />
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
  toolbar: { flexDirection: "row", gap: 12, marginBottom: 16 },
  searchWrap: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  searchInput: { flex: 1, paddingVertical: 12, fontSize: 14, fontFamily: "Poppins_400Regular", color: "#111827" },
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
    padding: 16,
    gap: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  cardName: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#111827" },
  cardSku: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#2563eb" },
  cardCategory: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#6b7280" },
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
