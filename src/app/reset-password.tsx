import {
  collectErrors,
  hasErrors,
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  type FieldErrors,
} from "@/lib/validation";
import { extractFieldErrors } from "@/services/api";
import { resetPassword } from "@/services/authApi";
import { Ionicons } from "@expo/vector-icons";
import { Link, router, useLocalSearchParams } from "expo-router";
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

type ResetField = "email" | "password" | "password_confirmation";

export default function ResetPasswordScreen() {
  // Token & email datang dari deep link pada email reset:
  // `sortvision://reset-password?token=...&email=...`
  const params = useLocalSearchParams<{ token?: string; email?: string }>();
  const token = typeof params.token === "string" ? params.token : "";

  const [email, setEmail] = useState(
    typeof params.email === "string" ? params.email : "",
  );
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors<ResetField>>({});
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const clearFieldError = (field: ResetField) => {
    if (errorMessage) setErrorMessage(null);
    setFieldErrors((current) => {
      if (!current[field]) return current;
      const next = { ...current };
      delete next[field];
      return next;
    });
  };

  const handleReset = async () => {
    setErrorMessage(null);

    const validationErrors = collectErrors<ResetField>({
      email: validateEmail(email),
      password: validatePassword(password),
      password_confirmation: validatePasswordConfirmation(password, confirm),
    });

    setFieldErrors(validationErrors);
    if (hasErrors(validationErrors)) {
      return;
    }

    setIsSubmitting(true);
    try {
      const message = await resetPassword({
        token,
        email: email.trim(),
        password,
        passwordConfirmation: confirm,
      });

      if (Platform.OS !== "web") {
        Alert.alert("Password diperbarui", message);
      }
      router.replace("/login");
    } catch (error) {
      const serverFieldErrors = extractFieldErrors(error);
      if (Object.keys(serverFieldErrors).length > 0) {
        setFieldErrors(serverFieldErrors as FieldErrors<ResetField>);
      }

      const message =
        error instanceof Error ? error.message : "Silakan coba lagi.";
      setErrorMessage(message);
      if (Platform.OS !== "web") {
        Alert.alert("Reset password gagal", message);
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
            <Ionicons name="key-outline" size={32} color="#fff" />
          </View>
          <Text style={styles.title}>Reset Password</Text>
          <Text style={styles.subtitle}>Buat password baru Anda</Text>
        </View>

        <View style={styles.card}>
          {!token ? (
            // Tanpa token, backend tidak akan pernah menerima reset — jangan
            // biarkan user mengisi form yang pasti gagal.
            <View style={styles.noticeBox}>
              <Ionicons name="alert-circle-outline" size={20} color="#b45309" />
              <Text style={styles.noticeText}>
                Token reset tidak ditemukan. Buka halaman ini lewat link pada
                email reset password, atau minta link baru.
              </Text>
            </View>
          ) : (
            <>
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email</Text>
                <TextInput
                  style={[styles.input, fieldErrors.email && styles.inputError]}
                  value={email}
                  onChangeText={(t) => {
                    setEmail(t);
                    clearFieldError("email");
                  }}
                  placeholder="email@example.com"
                  placeholderTextColor="#9ca3af"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoComplete="email"
                  editable={!isSubmitting}
                />
                {fieldErrors.email ? (
                  <Text style={styles.fieldError}>{fieldErrors.email}</Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Password Baru</Text>
                <View style={styles.pwWrap}>
                  <TextInput
                    style={[
                      styles.input,
                      { paddingRight: 44 },
                      fieldErrors.password && styles.inputError,
                    ]}
                    value={password}
                    onChangeText={(t) => {
                      setPassword(t);
                      clearFieldError("password");
                    }}
                    placeholder="Min. 8 karakter"
                    placeholderTextColor="#9ca3af"
                    secureTextEntry={!showPw}
                    autoComplete="new-password"
                    editable={!isSubmitting}
                  />
                  <Pressable
                    style={styles.eyeBtn}
                    onPress={() => setShowPw(!showPw)}
                  >
                    <Ionicons
                      name={showPw ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color="#6b7280"
                    />
                  </Pressable>
                </View>
                {fieldErrors.password ? (
                  <Text style={styles.fieldError}>{fieldErrors.password}</Text>
                ) : null}
              </View>

              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Konfirmasi Password</Text>
                <TextInput
                  style={[
                    styles.input,
                    fieldErrors.password_confirmation && styles.inputError,
                  ]}
                  value={confirm}
                  onChangeText={(t) => {
                    setConfirm(t);
                    clearFieldError("password_confirmation");
                  }}
                  placeholder="Ulangi password baru"
                  placeholderTextColor="#9ca3af"
                  secureTextEntry
                  autoComplete="new-password"
                  editable={!isSubmitting}
                />
                {fieldErrors.password_confirmation ? (
                  <Text style={styles.fieldError}>
                    {fieldErrors.password_confirmation}
                  </Text>
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
                onPress={handleReset}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>Reset Password</Text>
                )}
              </Pressable>
            </>
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
  fieldGroup: { marginBottom: 16 },
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
  noticeBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    backgroundColor: "#fef3c7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 16,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins_400Regular",
    color: "#92400e",
    lineHeight: 19,
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
  btnDisabled: { opacity: 0.7 },
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
