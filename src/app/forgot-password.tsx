import { useState } from "react";
import { View, Text, TextInput, Pressable, StyleSheet, ScrollView, KeyboardAvoidingView, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <View style={styles.brand}>
          <View style={styles.logo}>
            <Ionicons name="lock-closed-outline" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>Lupa Password</Text>
          <Text style={styles.subtitle}>
            {sent
              ? "Kami telah mengirim link reset password ke email Anda."
              : "Masukkan email Anda dan kami akan mengirimkan link reset password."}
          </Text>
        </View>

        <View style={styles.card}>
          {!sent ? (
            <>
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

              <Pressable style={styles.btn} onPress={() => setSent(true)}>
                <Text style={styles.btnText}>Kirim Link Reset</Text>
              </Pressable>
            </>
          ) : (
            <View style={styles.sentWrap}>
              <Ionicons name="checkmark-circle" size={48} color="#16a34a" />
              <Text style={styles.sentText}>Email terkirim!</Text>
            </View>
          )}

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
  subtitle: { fontSize: 14, fontFamily: "Poppins_400Regular", color: "#6b7280", textAlign: "center", marginTop: 8, lineHeight: 20 },
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
  fieldGroup: { marginBottom: 24 },
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
    marginBottom: 16,
  },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Poppins_600SemiBold" },
  sentWrap: { alignItems: "center", paddingVertical: 16, gap: 12 },
  sentText: { fontSize: 15, fontFamily: "Poppins_500Medium", color: "#16a34a" },
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
