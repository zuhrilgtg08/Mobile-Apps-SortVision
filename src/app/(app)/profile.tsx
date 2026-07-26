import { useCallback, useState } from "react";
import { ActivityIndicator, View, Text, TextInput, Pressable, StyleSheet, ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAuth } from "@/contexts/AuthContext";
import { useUpdatePassword, useUpdateProfile } from "@/hooks/useProfile";
import {
  validateEmail,
  validatePassword,
  validatePasswordConfirmation,
  validateRequired,
  type FieldErrors,
} from "@/lib/validation";
import { router } from "expo-router";

/** Notifikasi singkat di bawah tombol simpan. */
type Feedback = { kind: "ok" | "err"; message: string } | null;

function FormFeedback({ feedback }: { feedback: Feedback }) {
  if (!feedback) return null;

  return (
    <View style={[styles.feedback, feedback.kind === "ok" ? styles.feedbackOk : styles.feedbackErr]}>
      <Ionicons
        name={feedback.kind === "ok" ? "checkmark-circle-outline" : "alert-circle-outline"}
        size={16}
        color={feedback.kind === "ok" ? "#15803d" : "#b91c1c"}
      />
      <Text style={[styles.feedbackText, feedback.kind === "ok" ? styles.feedbackTextOk : styles.feedbackTextErr]}>
        {feedback.message}
      </Text>
    </View>
  );
}

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [email, setEmail] = useState(user?.email || "");
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [profileErrors, setProfileErrors] = useState<FieldErrors<"name" | "email">>({});
  const [passwordErrors, setPasswordErrors] = useState<
    FieldErrors<"current_password" | "password" | "password_confirmation">
  >({});
  const [profileFeedback, setProfileFeedback] = useState<Feedback>(null);
  const [passwordFeedback, setPasswordFeedback] = useState<Feedback>(null);

  const updateProfile = useUpdateProfile();
  const updatePassword = useUpdatePassword();

  const onSaveProfile = useCallback(async () => {
    const errors: FieldErrors<"name" | "email"> = {};
    const nameError = validateRequired(name, "Nama");
    const emailError = validateEmail(email);
    if (nameError) errors.name = nameError;
    if (emailError) errors.email = emailError;

    setProfileErrors(errors);
    setProfileFeedback(null);
    if (Object.keys(errors).length > 0) return;

    try {
      await updateProfile.mutateAsync({ name: name.trim(), email: email.trim() });
      setProfileFeedback({ kind: "ok", message: "Profil diperbarui." });
    } catch (error) {
      setProfileFeedback({
        kind: "err",
        message: error instanceof Error ? error.message : "Gagal memperbarui profil.",
      });
    }
  }, [name, email, updateProfile]);

  const onSavePassword = useCallback(async () => {
    const errors: FieldErrors<"current_password" | "password" | "password_confirmation"> = {};
    const currentError = validateRequired(currentPassword, "Password saat ini");
    const newError = validatePassword(newPassword);
    const confirmError = validatePasswordConfirmation(newPassword, confirmPassword);
    if (currentError) errors.current_password = currentError;
    if (newError) errors.password = newError;
    if (confirmError) errors.password_confirmation = confirmError;

    setPasswordErrors(errors);
    setPasswordFeedback(null);
    if (Object.keys(errors).length > 0) return;

    try {
      const message = await updatePassword.mutateAsync({
        current_password: currentPassword,
        password: newPassword,
        password_confirmation: confirmPassword,
      });
      // Jangan tinggalkan password di state setelah berhasil dikirim.
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordFeedback({ kind: "ok", message });
    } catch (error) {
      setPasswordFeedback({
        kind: "err",
        message: error instanceof Error ? error.message : "Gagal memperbarui password.",
      });
    }
  }, [currentPassword, newPassword, confirmPassword, updatePassword]);

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
            <TextInput style={[styles.input, profileErrors.name && styles.inputError]} value={name} onChangeText={setName} placeholder="Nama lengkap" placeholderTextColor="#9ca3af" />
            {profileErrors.name ? <Text style={styles.fieldError}>{profileErrors.name}</Text> : null}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={[styles.input, profileErrors.email && styles.inputError]} value={email} onChangeText={setEmail} placeholder="email@example.com" placeholderTextColor="#9ca3af" keyboardType="email-address" autoCapitalize="none" />
            {profileErrors.email ? <Text style={styles.fieldError}>{profileErrors.email}</Text> : null}
          </View>
          <Pressable
            style={[styles.saveBtn, updateProfile.isPending && styles.saveBtnDisabled]}
            onPress={onSaveProfile}
            disabled={updateProfile.isPending}
          >
            {updateProfile.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Update Profil</Text>
            )}
          </Pressable>
          <FormFeedback feedback={profileFeedback} />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Ubah Password</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Password Saat Ini</Text>
            <TextInput style={[styles.input, passwordErrors.current_password && styles.inputError]} value={currentPassword} onChangeText={setCurrentPassword} placeholder="••••••••" placeholderTextColor="#9ca3af" secureTextEntry />
            {passwordErrors.current_password ? <Text style={styles.fieldError}>{passwordErrors.current_password}</Text> : null}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Password Baru</Text>
            <TextInput style={[styles.input, passwordErrors.password && styles.inputError]} value={newPassword} onChangeText={setNewPassword} placeholder="Min. 8 karakter" placeholderTextColor="#9ca3af" secureTextEntry />
            {passwordErrors.password ? <Text style={styles.fieldError}>{passwordErrors.password}</Text> : null}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Konfirmasi Password</Text>
            <TextInput style={[styles.input, passwordErrors.password_confirmation && styles.inputError]} value={confirmPassword} onChangeText={setConfirmPassword} placeholder="Ulangi password" placeholderTextColor="#9ca3af" secureTextEntry />
            {passwordErrors.password_confirmation ? <Text style={styles.fieldError}>{passwordErrors.password_confirmation}</Text> : null}
          </View>
          <Pressable
            style={[styles.saveBtn, updatePassword.isPending && styles.saveBtnDisabled]}
            onPress={onSavePassword}
            disabled={updatePassword.isPending}
          >
            {updatePassword.isPending ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveBtnText}>Update Password</Text>
            )}
          </Pressable>
          <FormFeedback feedback={passwordFeedback} />
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
  saveBtnDisabled: { opacity: 0.6 },
  inputError: { borderColor: "#fca5a5", backgroundColor: "#fef2f2" },
  fieldError: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#b91c1c",
    marginTop: 4,
  },
  feedback: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 12,
    padding: 10,
    borderRadius: 12,
  },
  feedbackOk: { backgroundColor: "#f0fdf4" },
  feedbackErr: { backgroundColor: "#fef2f2" },
  feedbackText: { flex: 1, fontSize: 13, fontFamily: "Poppins_500Medium" },
  feedbackTextOk: { color: "#15803d" },
  feedbackTextErr: { color: "#b91c1c" },
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
