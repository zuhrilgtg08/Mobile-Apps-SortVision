import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";

export default function ResetPasswordScreen() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  const handleReset = () => {
    router.replace("/login");
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="key-outline" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Buat password baru Anda</Text>
        </View>

        <View style={styles.card}>
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password Baru</Text>
            <View style={styles.pwWrap}>
              <TextInput
                style={[styles.input, { paddingRight: 44 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="Min. 8 karakter"
                placeholderTextColor="#9ca3af"
                secureTextEntry={!showPw}
              />
              <Pressable style={styles.eyeBtn} onPress={() => setShowPw(!showPw)}>
                <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={20} color="#6b7280" />
              </Pressable>
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Konfirmasi Password</Text>
            <TextInput
              style={styles.input}
              value={confirm}
              onChangeText={setConfirm}
              placeholder="Ulangi password baru"
              placeholderTextColor="#9ca3af"
              secureTextEntry
            />
          </View>

          <Pressable style={styles.btn} onPress={handleReset}>
            <Text style={styles.btnText}>Reset Password</Text>
          </Pressable>

          <Link href="/login" style={styles.backLink}>
            <Ionicons name="arrow-back" size={16} color="#2563eb" /> Kembali ke login
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: "#f3f4f6" },
  container: { flexGrow: 1, justifyContent: "center", padding: 24 },
  brand: { alignItems: "center", marginBottom: 32 },
  logo: {
    width: 64,
    height: 64,
    borderRadius: 20,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },
  title: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#111827" },
  subtitle: { fontSize: 14, fontFamily: "Poppins_400Regular", color: "#6b7280", textAlign: "center", marginTop: 8 },
  card: {
    backgroundColor: "#fff",
    borderRadius: 24,
    padding: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  fieldGroup: { marginBottom: 16 },
  label: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "#374151", marginBottom: 6 },
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
  pwWrap: { position: "relative" },
  eyeBtn: { position: "absolute", right: 14, top: 14 },
  btn: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
    marginBottom: 16,
  },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Poppins_600SemiBold" },
  backLink: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    fontSize: 14,
    fontFamily: "Poppins_500Medium",
    color: "#2563eb",
    textAlign: "center",
  },
});
