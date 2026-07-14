import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { router } from "expo-router";

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleLogout = () => {
    logout();
    router.replace("/login");
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.avatarSection}>
        <View style={styles.avatarLarge}>
          <Text style={styles.avatarLargeText}>
            {user?.name?.split(" ").map((n) => n[0]).join("").toUpperCase()}
          </Text>
        </View>
        <Text style={styles.userName}>{user?.name}</Text>
        <Text style={styles.userRole}>{user?.role}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Informasi Profil</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Nama</Text>
            <TextInput style={styles.input} value={name} onChangeText={setName} placeholder="Nama lengkap" placeholderTextColor="#9ca3af" />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={email} onChangeText={setEmail} placeholder="email@example.com" placeholderTextColor="#9ca3af" keyboardType="email-address" />
          </View>
          <Pressable style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>Update Profil</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ubah Password</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Password Saat Ini</Text>
            <TextInput style={styles.input} value={currentPassword} onChangeText={setCurrentPassword} placeholder="••••••••" placeholderTextColor="#9ca3af" secureTextEntry />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Password Baru</Text>
            <TextInput style={styles.input} value={newPassword} onChangeText={setNewPassword} placeholder="Min. 8 karakter" placeholderTextColor="#9ca3af" secureTextEntry />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Konfirmasi Password</Text>
            <TextInput style={styles.input} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Ulangi password" placeholderTextColor="#9ca3af" secureTextEntry />
          </View>
          <Pressable style={styles.saveBtn}>
            <Text style={styles.saveBtnText}>Update Password</Text>
          </Pressable>
        </View>
      </View>

      <View style={styles.section}>
        <Pressable style={styles.dangerBtn} onPress={handleLogout}>
          <Ionicons name="log-out-outline" size={20} color="#dc2626" />
          <Text style={styles.dangerBtnText}>Keluar</Text>
        </Pressable>

        <Pressable style={styles.deleteBtn}>
          <Ionicons name="trash-outline" size={20} color="#dc2626" />
          <Text style={styles.deleteBtnText}>Hapus Akun</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  avatarSection: { alignItems: "center", paddingVertical: 24, gap: 8 },
  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 24,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarLargeText: { color: "#fff", fontSize: 28, fontFamily: "Poppins_700Bold" },
  userName: { fontSize: 20, fontFamily: "Poppins_700Bold", color: "#111827" },
  userRole: { fontSize: 14, fontFamily: "Poppins_500Medium", color: "#6b7280" },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontFamily: "Poppins_600SemiBold", color: "#111827", marginBottom: 10 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  field: { gap: 6 },
  label: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "#374151" },
  input: {
    backgroundColor: "#f9fafb",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: "#111827",
  },
  saveBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 4,
  },
  saveBtnText: { color: "#fff", fontSize: 15, fontFamily: "Poppins_600SemiBold" },
  dangerBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fff",
    borderRadius: 14,
    paddingVertical: 16,
    borderWidth: 1,
    borderColor: "#fca5a5",
    marginBottom: 12,
  },
  dangerBtnText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#dc2626" },
  deleteBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: "#fce7e7",
    borderRadius: 14,
    paddingVertical: 16,
  },
  deleteBtnText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#dc2626" },
});
