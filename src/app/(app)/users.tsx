import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, Modal } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import StatusBadge from "@/components/StatusBadge";

type User = {
  id: number;
  name: string;
  email: string;
  role: string;
  status: string;
};

const MOCK_USERS: User[] = [
  { id: 1, name: "Administrator", email: "admin@sortvision.id", role: "Administrator", status: "Active" },
  { id: 2, name: "Operator Produksi", email: "operator@sortvision.id", role: "Operator", status: "Active" },
  { id: 3, name: "Supervisor QC", email: "supervisor@sortvision.id", role: "Supervisor", status: "Active" },
  { id: 4, name: "Manajer Produksi", email: "manager@sortvision.id", role: "Manager", status: "Inactive" },
];

export default function UsersScreen() {
  const [search, setSearch] = useState("");
  const [modal, setModal] = useState(false);
  const [selected, setSelected] = useState<User | null>(null);

  const filtered = MOCK_USERS.filter(
    (u) => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.includes(search)
  );

  const openEdit = (user: User) => {
    setSelected(user);
    setModal(true);
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#9ca3af" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari user..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={setSearch}
          />
        </View>
        <Pressable style={styles.addBtn} onPress={() => { setSelected(null); setModal(true); }}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {filtered.map((user) => (
        <Pressable key={user.id} style={styles.card} onPress={() => openEdit(user)}>
          <View style={styles.cardLeft}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{user.name.split(" ").map((n) => n[0]).join("")}</Text>
            </View>
            <View>
              <Text style={styles.userName}>{user.name}</Text>
              <Text style={styles.userEmail}>{user.email}</Text>
              <Text style={styles.userRole}>{user.role}</Text>
            </View>
          </View>
          <StatusBadge status={user.status} />
        </Pressable>
      ))}

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{selected ? "Edit User" : "Tambah User"}</Text>
            <TextInput style={styles.input} placeholder="Nama" placeholderTextColor="#9ca3af" defaultValue={selected?.name} />
            <TextInput style={styles.input} placeholder="Email" placeholderTextColor="#9ca3af" defaultValue={selected?.email} keyboardType="email-address" />
            <TextInput style={styles.input} placeholder="Role" placeholderTextColor="#9ca3af" defaultValue={selected?.role} />
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
  card: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12, flex: 1 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#2563eb" },
  userName: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#111827" },
  userEmail: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#6b7280", marginTop: 1 },
  userRole: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#2563eb", marginTop: 2 },
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
