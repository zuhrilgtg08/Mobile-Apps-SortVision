import { EmptyState, ErrorState, LoadingState, Paginator } from "@/components/QueryStates";
import StatusBadge from "@/components/StatusBadge";
import { useCategories } from "@/hooks/useCategories";
import {
  useCreateProduct,
  useDeleteProduct,
  useProducts,
  useUpdateProduct,
} from "@/hooks/useProducts";
import { useDebounced } from "@/hooks/useDebounced";
import { extractFieldErrors } from "@/services/api";
import {
  PRODUCT_STATUSES,
  type Product,
  type ProductStatus,
} from "@/services/productApi";
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
  Text,
  TextInput,
  View,
} from "react-native";

const { width } = Dimensions.get("window");
const CARD_W = (width - 44) / 2;

type FormState = {
  name: string;
  status: ProductStatus;
  stock: string;
  category_id: number | null;
  description: string;
};

const EMPTY_FORM: FormState = {
  name: "",
  status: "active",
  stock: "0",
  category_id: null,
  description: "",
};

export default function ProductsScreen() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);

  // Tanpa debounce, tiap ketikan memicu satu request ke server.
  const debouncedSearch = useDebounced(search, 350);

  const query = useProducts({ search: debouncedSearch, page });
  const categoriesQuery = useCategories({ is_active: true, per_page: 100 });

  const createProduct = useCreateProduct();
  const updateProduct = useUpdateProduct();
  const deleteProduct = useDeleteProduct();
  const isSaving = createProduct.isPending || updateProduct.isPending;

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFieldErrors({});
    setFormError(null);
    setModal(true);
  };

  const openEdit = (product: Product) => {
    setEditing(product);
    setForm({
      name: product.name,
      status: product.status,
      stock: String(product.stock),
      category_id: product.category_id,
      description: product.description ?? "",
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
      status: form.status,
      stock: Number.parseInt(form.stock, 10) || 0,
      category_id: form.category_id,
      description: form.description.trim() || null,
    };

    try {
      if (editing) {
        await updateProduct.mutateAsync({ id: editing.id, input });
      } else {
        await createProduct.mutateAsync(input);
      }
      setModal(false);
    } catch (error) {
      const serverErrors = extractFieldErrors(error);
      if (Object.keys(serverErrors).length > 0) {
        setFieldErrors(serverErrors);
      }
      setFormError(
        error instanceof Error ? error.message : "Gagal menyimpan produk.",
      );
    }
  };

  const confirmDelete = (product: Product) => {
    Alert.alert(
      "Hapus produk",
      `Hapus "${product.name}"? Tindakan ini tidak bisa dibatalkan.`,
      [
        { text: "Batal", style: "cancel" },
        {
          text: "Hapus",
          style: "destructive",
          onPress: () => {
            deleteProduct.mutate(product.id, {
              onError: (error) =>
                Alert.alert(
                  "Gagal menghapus",
                  error instanceof Error ? error.message : "Coba lagi.",
                ),
            });
          },
        },
      ],
    );
  };

  const products = query.data?.data ?? [];
  const meta = query.data?.meta;
  const categories = categoriesQuery.data?.data ?? [];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.toolbar}>
        <View style={styles.searchWrap}>
          <Ionicons name="search-outline" size={18} color="#9ca3af" style={{ marginRight: 8 }} />
          <TextInput
            style={styles.searchInput}
            placeholder="Cari produk..."
            placeholderTextColor="#9ca3af"
            value={search}
            onChangeText={(t) => {
              setSearch(t);
              setPage(1);
            }}
          />
          {query.isFetching && !query.isLoading ? (
            <ActivityIndicator size="small" color="#9ca3af" />
          ) : null}
        </View>
        <Pressable style={styles.addBtn} onPress={openCreate}>
          <Ionicons name="add" size={22} color="#fff" />
        </Pressable>
      </View>

      {query.isLoading ? (
        <LoadingState label="Memuat produk..." />
      ) : query.isError ? (
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      ) : products.length === 0 ? (
        <EmptyState
          icon="cube-outline"
          title="Belum ada produk"
          hint={
            debouncedSearch
              ? `Tidak ada hasil untuk "${debouncedSearch}".`
              : "Tambahkan produk pertama lewat tombol +."
          }
        />
      ) : (
        <>
          <View style={styles.grid}>
            {products.map((product) => (
              <Pressable
                key={product.id}
                style={styles.card}
                onPress={() => openEdit(product)}
                onLongPress={() => confirmDelete(product)}
              >
                <View style={styles.cardImage}>
                  <Ionicons name="cube-outline" size={32} color="#2563eb" />
                </View>
                <Text style={styles.cardName} numberOfLines={2}>
                  {product.name}
                </Text>
                <Text style={styles.cardSku}>{product.sku ?? product.code}</Text>
                <Text style={styles.cardCategory}>
                  {product.category?.name ?? "Tanpa kategori"}
                </Text>
                <StatusBadge status={product.status_label} />
              </Pressable>
            ))}
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
                {editing ? "Edit Produk" : "Tambah Produk"}
              </Text>

              {editing ? (
                <Text style={styles.readonlyNote}>
                  Kode {editing.code} · SKU {editing.sku ?? "-"} (dibuat otomatis,
                  tidak bisa diubah)
                </Text>
              ) : null}

              <TextInput
                style={[styles.input, fieldErrors.name && styles.inputError]}
                placeholder="Nama produk"
                placeholderTextColor="#9ca3af"
                value={form.name}
                onChangeText={(t) => setForm((f) => ({ ...f, name: t }))}
              />
              {fieldErrors.name ? (
                <Text style={styles.fieldError}>{fieldErrors.name}</Text>
              ) : null}

              <TextInput
                style={[styles.input, fieldErrors.stock && styles.inputError]}
                placeholder="Stok"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                value={form.stock}
                onChangeText={(t) => setForm((f) => ({ ...f, stock: t }))}
              />
              {fieldErrors.stock ? (
                <Text style={styles.fieldError}>{fieldErrors.stock}</Text>
              ) : null}

              <Text style={styles.label}>Status</Text>
              <View style={styles.chipRow}>
                {PRODUCT_STATUSES.map((status) => (
                  <Pressable
                    key={status}
                    style={[styles.chip, form.status === status && styles.chipActive]}
                    onPress={() => setForm((f) => ({ ...f, status }))}
                  >
                    <Text
                      style={[
                        styles.chipText,
                        form.status === status && styles.chipTextActive,
                      ]}
                    >
                      {status}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <Text style={styles.label}>Kategori</Text>
              <View style={styles.chipRow}>
                <Pressable
                  style={[styles.chip, form.category_id === null && styles.chipActive]}
                  onPress={() => setForm((f) => ({ ...f, category_id: null }))}
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.category_id === null && styles.chipTextActive,
                    ]}
                  >
                    Tanpa kategori
                  </Text>
                </Pressable>
                {categories.map((category) => (
                  <Pressable
                    key={category.id}
                    style={[
                      styles.chip,
                      form.category_id === category.id && styles.chipActive,
                    ]}
                    onPress={() =>
                      setForm((f) => ({ ...f, category_id: category.id }))
                    }
                  >
                    <Text
                      style={[
                        styles.chipText,
                        form.category_id === category.id && styles.chipTextActive,
                      ]}
                    >
                      {category.name}
                    </Text>
                  </Pressable>
                ))}
              </View>

              <TextInput
                style={[styles.input, styles.textarea]}
                placeholder="Deskripsi (opsional)"
                placeholderTextColor="#9ca3af"
                multiline
                value={form.description}
                onChangeText={(t) => setForm((f) => ({ ...f, description: t }))}
              />

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
  cardImage: {
    width: 56,
    height: 56,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 8,
  },
  cardName: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#111827" },
  cardSku: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#2563eb" },
  cardCategory: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#6b7280" },
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
  readonlyNote: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#6b7280",
    marginBottom: 4,
  },
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
  textarea: { minHeight: 80, textAlignVertical: "top" },
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
