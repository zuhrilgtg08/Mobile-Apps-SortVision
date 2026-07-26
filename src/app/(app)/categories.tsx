import { EmptyState, ErrorState, LoadingState, Paginator } from "@/components/QueryStates";
import {
  useCategories,
  useCreateCategory,
  useDeleteCategory,
  useUpdateCategory,
} from "@/hooks/useCategories";
import { extractFieldErrors } from "@/services/api";
import { type Category } from "@/services/categoryApi";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const CARD_W = (width - 44) / 2;

/** Warna kartu diputar berdasarkan urutan — backend tidak menyimpan warna. */
const CARD_COLORS = ["#2563eb", "#16a34a", "#ca8a04", "#dc2626", "#7c3aed", "#0891b2"];

type FormState = {
  name: string;
  description: string;
  sort_order: string;
  is_active: boolean;
};

const EMPTY_FORM: FormState = {
  name: "",
  description: "",
  sort_order: "0",
  is_active: true,
};

export default function CategoriesScreen() {
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Category | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const query = useCategories({ page });
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();
  const isSaving = createCategory.isPending || updateCategory.isPending;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError(null);
    setModal(true);
  };

  const openEdit = (category: Category) => {
    setEditing(category);
    setForm({
      name: category.name,
      description: category.description ?? "",
      sort_order: String(category.sort_order),
      is_active: category.is_active,
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
      description: form.description.trim() || null,
      sort_order: Number.parseInt(form.sort_order, 10) || 0,
      is_active: form.is_active,
    };

    try {
      if (editing) {
        await updateCategory.mutateAsync({ id: editing.id, input });
      } else {
        await createCategory.mutateAsync(input);
      }
      setModal(false);
    } catch (error) {
      const serverErrors = extractFieldErrors(error);
      if (Object.keys(serverErrors).length > 0) {
        setFieldErrors(serverErrors);
      }
      setFormError(
        error instanceof Error ? error.message : "Gagal menyimpan kategori.",
      );
    }
  };

  const confirmDelete = (category: Category) => {
    Alert.alert(
      "Hapus kategori",
      `Hapus "${category.name}"? Produk di dalamnya akan kehilangan kategori.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () =>
            deleteCategory.mutate(category.id, {
              onError: (error) =>
                Alert.alert(
                  "Gagal menghapus",
                  error instanceof Error ? error.message : "Coba lagi.",
                ),
            }),
        },
      ],
    );
  };

  const categories = query.data?.data ?? [];
  const meta = query.data?.meta;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.toolbar}>
        <Text style={styles.count}>
          {meta ? `${meta.total} kategori` : "Memuat..."}
        </Text>
        <Pressable style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {query.isLoading ? (
        <LoadingState label="Memuat kategori..." />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : categories.length === 0 ? (
        <EmptyState
          icon="layers-outline"
          title="Belum ada kategori"
          hint="Tambahkan kategori pertama lewat tombol +."
        />
      ) : (
        <>
          <View style={styles.grid}>
            {categories.map((category, index) => {
              const color = CARD_COLORS[index % CARD_COLORS.length];
              return (
                <Pressable
                  key={category.id}
                  style={styles.card}
                  onPress={() => openEdit(category)}
                  onLongPress={() => confirmDelete(category)}
                >
                  <View style={[styles.iconWrap, { backgroundColor: color + "20" }]}>
                    <Ionicons name="layers-outline" size={28} color={color} />
                  </View>
                  <Text style={styles.catName} numberOfLines={2}>
                    {category.name}
                  </Text>
                  <Text style={styles.catCount}>
                    {category.products_count ?? 0} produk
                  </Text>
                  {!category.is_active ? (
                    <Text style={styles.inactive}>Nonaktif</Text>
                  ) : null}
                </Pressable>
              );
            })}
          </View>

          <Text style={styles.hint}>Tekan lama sebuah kartu untuk menghapus.</Text>

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
                {editing ? "Edit Kategori" : "Tambah Kategori"}
              </Text>

              <TextInput
                style={[styles.input, fieldErrors.name && styles.inputError]}
                placeholder="Nama kategori"
                placeholderTextColor="#9ca3af"
                value={form.name}
                onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
              />
              {fieldErrors.name ? (
                <Text style={styles.fieldError}>{fieldErrors.name}</Text>
              ) : null}

              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Deskripsi (opsional)"
                placeholderTextColor="#9ca3af"
                multiline
                value={form.description}
                onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
              />

              <TextInput
                style={[styles.input, fieldErrors.sort_order && styles.inputError]}
                placeholder="Urutan tampil"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                value={form.sort_order}
                onChangeText={(t) => setForm((f) => ({ ...f, sort_order: t }))}
              />
              {fieldErrors.sort_order ? (
                <Text style={styles.fieldError}>{fieldErrors.sort_order}</Text>
              ) : null}

              <View style={styles.switchRow}>
                <Text style={styles.label}>Aktif</Text>
                <Switch
                  value={form.is_active}
                  onValueChange={(v) => setForm((f) => ({ ...f, is_active: v }))}
                  trackColor={{ true: "#2563eb" }}
                />
              </View>

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
  toolbar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  count: { fontSize: 14, fontFamily: "Poppins_500Medium", color: "#6b7280" },
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
  iconWrap: {
    width: 52,
    height: 52,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  catName: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#111827" },
  catCount: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#6b7280" },
  inactive: { fontSize: 11, fontFamily: "Poppins_500Medium", color: "#b45309" },
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
  textarea: { minHeight: 70, textAlignVertical: "top" },
  inputError: { borderColor: "#dc2626" },
  fieldError: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#dc2626",
    marginTop: -6,
  },
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
