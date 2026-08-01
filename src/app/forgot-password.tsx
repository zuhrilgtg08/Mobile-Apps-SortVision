import { validateEmail } from "@/lib/validation";
import { requestPasswordReset } from "@/services/authApi";
import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [fieldError, setFieldError] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const sent = successMessage !== null;

  const handleSubmit = async () => {
    setErrorMessage(null);

    const emailError = validateEmail(email);
    setFieldError(emailError);
    if (emailError) {
      return;
    }

    setIsSubmitting(true);
    try {
      // Sukses hanya ditampilkan kalau backend benar-benar menerima permintaan.
      const message = await requestPasswordReset(email.trim());
      setSuccessMessage(message);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Silakan coba lagi.";
      setErrorMessage(message);
      if (Platform.OS !== "web") {
        Alert.alert("Gagal mengirim link reset", message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.container}
        keyboardShouldPersistTaps="handled"
      >
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
                  style={[styles.input, fieldError && styles.inputError]}
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    if (fieldError) setFieldError(null);
                    if (errorMessage) setErrorMessage(null);
                  }}
                  placeholder="email@example.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isSubmitting}
                />
                {fieldError ? (
                  <Text style={styles.fieldError}>{fieldError}</Text>
                ) : null}
              </View>

              {errorMessage ? (
                <View style={styles.errorBox}>
                  <Ionicons
                    name="alert-circle-outline"
                    size={18}
                    color="#dc2626"
                  />
                  <Text style={styles.errorText}>{errorMessage}</Text>
                </View>
              ) : null}

              <Pressable
                style={[styles.btn, isSubmitting && styles.btnDisabled]}
                onPress={handleSubmit}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Kirim Link Reset</Text>
                )}
              </Pressable>
            </>
          ) : (
            <View style={styles.sentWrap}>
              <Ionicons name="checkmark-circle" size={48} color="#16a34a" />
              <Text style={styles.sentText}>{successMessage}</Text>
            </View>
          )}

          <Link href="/login" style={styles.backLink}>
            <Ionicons name="arrow-back" size={16} color="#2563eb" /> Kembali ke
            login
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
  subtitle: {
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#6b7280",
    textAlign: "center",
    marginTop: 8,
    lineHeight: 20,
  },
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
  label: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#374151",
    marginBottom: 6,
  },
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
  inputError: { borderColor: "#dc2626" },
  fieldError: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#dc2626",
    marginTop: 6,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fce7e7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#dc2626",
  },
  btn: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
    marginBottom: 16,
  },
  btnDisabled: { opacity: 0.7 },
  btnText: { color: "#fff", fontSize: 16, fontFamily: "Poppins_600SemiBold" },
  sentWrap: { alignItems: "center", paddingVertical: 16, gap: 12 },
  sentText: {
    fontSize: 15,
    fontFamily: "Poppins_500Medium",
    color: "#16a34a",
    textAlign: "center",
  },
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
