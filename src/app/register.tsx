import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";

export default function RegisterScreen() {
  const { login } = useAuth();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordConfirmation, setPasswordConfirmation] = useState("");

  const handleRegister = async () => {
    await login(email, password);
    router.replace("/(app)/dashboard");
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="scan-outline" size={36} color="#fff" />
          </View>
          <Text style={styles.brandName}>SortVision</Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.title}>Daftar</Text>
          <Text style={styles.subtitle}>Buat akun baru Anda</Text>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Nama</Text>
            <TextInput
              style={styles.input}
              value={name}
              onChangeText={setName}
              placeholder="Nama lengkap"
              placeholderTextColor="#9ca3af"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="email@example.com"
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 8 karakter"
              placeholderTextColor="#9ca3af"
              secureTextEntry
            />
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.label}>Konfirmasi Password</Text>
            <TextInput
              style={styles.input}
              value={passwordConfirmation}
              onChangeText={setPasswordConfirmation}
              placeholder="Ulangi password"
              placeholderTextColor="#9ca3af"
              secureTextEntry
            />
          </View>

          <Pressable style={styles.btn} onPress={handleRegister}>
            <Text style={styles.btnText}>Daftar</Text>
          </Pressable>

          <View style={styles.footer}>
            <Text style={styles.footerText}>Sudah punya akun?</Text>
            <Link href="/login" style={styles.footerLink}>Masuk</Link>
          </View>
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
    width: 72,
    height: 72,
    borderRadius: 22,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  brandName: { fontSize: 28, fontFamily: "Poppins_700Bold", color: "#111827" },
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
  title: { fontSize: 22, fontFamily: "Poppins_700Bold", color: "#111827" },
  subtitle: { fontSize: 14, fontFamily: "Poppins_400Regular", color: "#6b7280", marginTop: 4, marginBottom: 24 },
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
  btn: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Poppins_600SemiBold" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24, gap: 4 },
  footerText: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#6b7280" },
  footerLink: { fontSize: 13, fontFamily: "Poppins_600SemiBold", color: "#2563eb" },
});
