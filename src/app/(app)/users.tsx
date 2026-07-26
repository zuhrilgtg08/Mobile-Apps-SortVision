import { EmptyState, ErrorState, LoadingState, Paginator } from "@/components/QueryStates";
import { useAuth } from "@/contexts/AuthContext";
import { useDebounced } from "@/hooks/useDebounced";
import {
  useCreateUser,
  useDeleteUser,
  useUpdateUser,
  useUsers,
} from "@/hooks/useUsers";
import { extractFieldErrors } from "@/services/api";
import { USER_ROLES, type ManagedUser, type UserRole } from "@/services/userApi";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

const ROLE_LABELS: Record<UserRole, string> = {
  admin: "Administrator",
  supervisor_qc: "Supervisor QC",
  operator: "Operator",
  viewer: "Viewer",
};

type FormState = {
  name: string;
  email: string;
  role: UserRole;
  title: string;
  password: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  email: "",
  role: "viewer",
  title: "",
  password: "",
  is_active: true,
};

export default function UsersScreen() {
  const { user: currentUser } = useAuth();
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<ManagedUser | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const debouncedSearch = useDebounced(search, 350);
  const query = useUsers({ search: debouncedSearch, role: roleFilter, page });

  const createUser = useCreateUser();
  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const isSaving = createUser.isPending || updateUser.isPending;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError(null);
    setModal(true);
  };

  const openEdit = (user: ManagedUser) => {
    setEditing(user);
    setForm({
      name: user.name,
      email: user.email,
      role: user.role,
      title: user.title ?? "",
      password: "",
      is_active: user.is_active,
    });
    setFieldErrors({});
    setFormError(null);
    setModal(true);
  };

  const handleSave = async () => {
    setFieldErrors({});
    setFormError(null);

    const input = {
      name: form.name.trim(),
      email: form.email.trim(),
      role: form.role,
      title: form.title.trim() || null,
      is_active: form.is_active,
      // Kosong saat edit = biarkan password lama.
      password: form.password || undefined,
    };

    try {
      if (editing) {
        await updateUser.mutateAsync({ id: editing.id, input });
      } else {
        await createUser.mutateAsync(input);
      }
      setModal(false);
    } catch (error) {
      const serverErrors = extractFieldErrors(error);
      if (Object.keys(serverErrors).length > 0) {
        setFieldErrors(serverErrors);
      }
      setFormError(
        error instanceof Error ? error.message : "Gagal menyimpan user.",
      );
    }
  };

  const confirmDelete = (user: ManagedUser) => {
    Alert.alert("Hapus user", `Hapus akun "${user.name}"?`, [
      { text: "Batal", style: "cancel" },
      {
        text: "Hapus",
        style: "destructive",
        onPress: () =>
          deleteUser.mutate(user.id, {
            // Backend menolak menghapus admin tunggal / akun sendiri dengan
            // 422 beserta pesannya — tampilkan apa adanya.
            onError: (error) =>
              Alert.alert(
                "Tidak bisa dihapus",
                error instanceof Error ? error.message : "Coba lagi.",
              ),
          }),
      },
    ]);
  };

  const users = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#9ca3af" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari nama atau email..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setPage(1);
            }}
            autoCapitalize="none"
          />
          {query.isFetching && !query.isLoading ? (
            <ActivityIndicator size="small" color="#9ca3af" />
          ) : null}
        </View>
        <Pressable style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterRow}
      >
        <Pressable
          style={[styles.chip, roleFilter === "" && styles.chipActive]}
          onPress={() => {
            setRoleFilter("");
            setPage(1);
          }}
        >
          <Text style={[styles.chipText, roleFilter === "" && styles.chipTextActive]}>
            Semua
          </Text>
        </Pressable>
        {USER_ROLES.map((role) => (
          <Pressable
            key={role}
            style={[styles.chip, roleFilter === role && styles.chipActive]}
            onPress={() => {
              setRoleFilter(role);
              setPage(1);
            }}
          >
            <Text
              style={[styles.chipText, roleFilter === role && styles.chipTextActive]}
            >
              {ROLE_LABELS[role]}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {query.isLoading ? (
        <LoadingState label="Memuat user..." />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : users.length === 0 ? (
        <EmptyState icon="people-outline" title="Tidak ada user" />
      ) : (
        <>
          <View style={styles.list}>
            {users.map((user) => (
              <Pressable
                key={user.id}
                style={styles.row}
                onPress={() => openEdit(user)}
                onLongPress={() => confirmDelete(user)}
              >
                <View style={styles.avatar}>
                  <Text style={styles.avatarText}>{user.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.rowName}>
                    {user.name}
                    {currentUser?.id === user.id ? " (Anda)" : ""}
                  </Text>
                  <Text style={styles.rowEmail}>{user.email}</Text>
                  <Text style={styles.rowRole}>{user.role_label}</Text>
                </View>
                <View
                  style={[
                    styles.statusDot,
                    { backgroundColor: user.is_active ? "#16a34a" : "#d1d5db" },
                  ]}
                />
              </Pressable>
            ))}
          </View>

          <Text style={styles.hint}>Tekan lama sebuah baris untuk menghapus.</Text>

          {meta ? (
            <Paginator
              page={meta.current_page}
              lastPage={meta.last_page}
              total={meta.total}
              onChange={setPage}
            />
          ) : null}
        </>
      )}

      <Modal visible={modal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <ScrollView
            contentContainerStyle={styles.modalScroll}
            keyboardShouldPersistTaps="handled"
          >
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>
                {editing ? "Edit User" : "Tambah User"}
              </Text>

              <TextInput
                style={[styles.input, fieldErrors.name && styles.inputError]}
                placeholder="Nama lengkap"
                placeholderTextColor="#9ca3af"
                value={form.name}
                onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
              />
              {fieldErrors.name ? (
                <Text style={styles.fieldError}>{fieldErrors.name}</Text>
              ) : null}

              <TextInput
                style={[styles.input, fieldErrors.email && styles.inputError]}
                placeholder="email@example.com"
                placeholderTextColor="#9ca3af"
                keyboardType="email-address"
                autoCapitalize="none"
                value={form.email}
                onChangeText={(t) => setForm((f) => ({ ...f, email: t }))}
              />
              {fieldErrors.email ? (
                <Text style={styles.fieldError}>{fieldErrors.email}</Text>
              ) : null}

              <TextInput
                style={styles.input}
                placeholder="Jabatan (opsional)"
                placeholderTextColor="#9ca3af"
                value={form.title}
                onChangeText={(t) => setForm((f) => ({ ...f, title: t }))}
              />

              <TextInput
                style={[styles.input, fieldErrors.password && styles.inputError]}
                placeholder={
                  editing ? "Password baru (kosongkan bila tetap)" : "Password (min. 8)"
                }
                placeholderTextColor="#9ca3af"
                secureTextEntry
                value={form.password}
                onChangeText={(t) => setForm((f) => ({ ...f, password: t }))}
              />
              {fieldErrors.password ? (
                <Text style={styles.fieldError}>{fieldErrors.password}</Text>
              ) : null}

              <Text style={styles.label}>Role</Text>
              <View style={styles.chipRow}>
                {USER_ROLES.map((role) => (
                  <Pressable
                    key={role}
                    style={[styles.chip, form.role === role && styles.chipActive]}
                    onPress={() => setForm((f) => ({ ...f, role }))}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        form.role === role && styles.chipTextActive,
                      ]}
                    >
                      {ROLE_LABELS[role]}
                    </Text>
                  </Pressable>
                ))}
              </View>
              {fieldErrors.role ? (
                <Text style={styles.fieldError}>{fieldErrors.role}</Text>
              ) : null}

              <View style={styles.switchRow}>
                <Text style={styles.label}>Akun aktif</Text>
                <Switch
                  value={form.is_active}
                  onValueChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                  trackColor={{ true: "#2563eb" }}
                />
              </View>
              {fieldErrors.is_active ? (
                <Text style={styles.fieldError}>{fieldErrors.is_active}</Text>
              ) : null}

              {formError ? (
                <View style={styles.errorBox}>
                  <Ionicons name="alert-circle-outline" size={18} color="#dc2626" />
                  <Text style={styles.errorText}>{formError}</Text>
                </View>
              ) : null}

              <View style={styles.modalActions}>
                <Pressable
                  style={styles.cancelBtn}
                  onPress={() => setModal(false)}
                  disabled={isSaving}
                >
                  <Text style={styles.cancelText}>Batal</Text>
                </Pressable>
                <Pressable
                  style={[styles.saveBtn, isSaving && styles.saveBtnDisabled]}
                  onPress={handleSave}
                  disabled={isSaving}
                >
                  {isSaving ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.saveText}>Simpan</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  toolbar: { flexDirection: "row", gap: 12, marginBottom: 12 },
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
  searchInput: {
    flex: 1,
    paddingVertical: 12,
    fontSize: 14,
    fontFamily: "Poppins_400Regular",
    color: "#111827",
  },
  addBtn: {
    width: 48,
    height: 48,
    borderRadius: 14,
    backgroundColor: "#2563eb",
    justifyContent: "center",
    alignItems: "center",
  },
  filterRow: { gap: 8, paddingBottom: 16 },
  list: { gap: 10 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  avatarText: { fontSize: 15, fontFamily: "Poppins_700Bold", color: "#2563eb" },
  rowName: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#111827" },
  rowEmail: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#6b7280" },
  rowRole: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#2563eb" },
  statusDot: { width: 10, height: 10, borderRadius: 5 },
  hint: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#9ca3af",
    textAlign: "center",
    marginTop: 16,
  },
  modalOverlay: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" },
  modalScroll: { flexGrow: 1, justifyContent: "flex-end" },
  modalContent: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    gap: 12,
  },
  modalTitle: { fontSize: 18, fontFamily: "Poppins_700Bold", color: "#111827" },
  label: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "#374151" },
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
    marginTop: -6,
  },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    backgroundColor: "#f9fafb",
  },
  chipActive: { backgroundColor: "#2563eb", borderColor: "#2563eb" },
  chipText: { fontSize: 13, fontFamily: "Poppins_500Medium", color: "#6b7280" },
  chipTextActive: { color: "#fff" },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 4,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fce7e7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#dc2626",
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
  saveBtnDisabled: { opacity: 0.7 },
  saveText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#fff" },
});
