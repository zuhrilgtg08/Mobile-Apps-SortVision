import { ErrorState, LoadingState } from "@/components/QueryStates";
import { useRoles, useUpdateRoles } from "@/hooks/useUsers";
import { type AccessLevel } from "@/services/userApi";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";

const ACCESS_COLORS: Record<AccessLevel, string> = {
  f: "#16a34a",
  w: "#2563eb",
  r: "#ca8a04",
  "-": "#9ca3af",
};

/** Urutan siklus saat sebuah sel ditekan. */
const ACCESS_CYCLE: AccessLevel[] = ["-", "r", "w", "f"];

export default function RolesScreen() {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [pending, setPending] = useState<
    { role: string; module: string; access: AccessLevel }[]
  >([]);

  const query = useRoles();
  const updateRoles = useUpdateRoles();

  if (query.isLoading) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <LoadingState label="Memuat hak akses..." />
      </ScrollView>
    );
  }

  if (query.isError || !query.data) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </ScrollView>
    );
  }

  const { roles, modules, access_levels, matrix } = query.data;

  /** Nilai efektif sebuah sel: perubahan lokal menang atas data server. */
  const accessFor = (role: string, module: string): AccessLevel => {
    const local = pending.find((p) => p.role === role && p.module === module);
    return local?.access ?? matrix[role]?.[module] ?? "-";
  };

  const cycle = (role: string, module: string) => {
    const current = accessFor(role, module);
    const next =
      ACCESS_CYCLE[(ACCESS_CYCLE.indexOf(current) + 1) % ACCESS_CYCLE.length];

    setPending((list) => [
      ...list.filter((p) => !(p.role === role && p.module === module)),
      { role, module, access: next },
    ]);
  };

  const handleSave = async () => {
    if (pending.length === 0) return;

    try {
      await updateRoles.mutateAsync(pending);
      setPending([]);
      Alert.alert("Tersimpan", "Hak akses berhasil diperbarui.");
    } catch (error) {
      Alert.alert(
        "Gagal menyimpan",
        error instanceof Error ? error.message : "Coba lagi.",
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.legend}>
        {access_levels.map((level) => (
          <View key={level.key} style={styles.legendItem}>
            <View
              style={[styles.legendDot, { backgroundColor: ACCESS_COLORS[level.key] }]}
            />
            <Text style={styles.legendText}>{level.label}</Text>
          </View>
        ))}
      </View>

      <Text style={styles.hint}>
        Ketuk sebuah modul untuk mengubah levelnya. Hak akses ini benar-benar
        ditegakkan di aplikasi mobile.
      </Text>

      {roles.map((role) => {
        const isOpen = expanded === role.key;
        return (
          <View key={role.key} style={styles.card}>
            <Pressable
              style={styles.cardHeader}
              onPress={() => setExpanded(isOpen ? null : role.key)}
            >
              <View style={styles.cardLeft}>
                <View style={styles.iconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={24} color="#2563eb" />
                </View>
                <View>
                  <Text style={styles.roleName}>{role.label}</Text>
                  <Text style={styles.roleMeta}>{modules.length} modul</Text>
                </View>
              </View>
              <Ionicons
                name={isOpen ? "chevron-up" : "chevron-down"}
                size={20}
                color="#9ca3af"
              />
            </Pressable>

            {isOpen ? (
              <View style={styles.permList}>
                {modules.map((module) => {
                  const access = accessFor(role.key, module);
                  const changed = pending.some(
                    (p) => p.role === role.key && p.module === module,
                  );
                  return (
                    <Pressable
                      key={module}
                      style={styles.permRow}
                      onPress={() => cycle(role.key, module)}
                    >
                      <Text style={styles.permLabel}>{module}</Text>
                      <View style={styles.permRight}>
                        {changed ? <View style={styles.changedDot} /> : null}
                        <View
                          style={[
                            styles.accessBadge,
                            { backgroundColor: ACCESS_COLORS[access] + "20" },
                          ]}
                        >
                          <Text
                            style={[
                              styles.accessText,
                              { color: ACCESS_COLORS[access] },
                            ]}
                          >
                            {access_levels.find((l) => l.key === access)?.label ??
                              access}
                          </Text>
                        </View>
                      </View>
                    </Pressable>
                  );
                })}
              </View>
            ) : null}
          </View>
        );
      })}

      {pending.length > 0 ? (
        <View style={styles.saveBar}>
          <Pressable style={styles.discardBtn} onPress={() => setPending([])}>
            <Text style={styles.discardText}>Batalkan</Text>
          </Pressable>
          <Pressable
            style={[styles.saveBtn, updateRoles.isPending && styles.saveBtnDisabled]}
            onPress={handleSave}
            disabled={updateRoles.isPending}
          >
            {updateRoles.isPending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.saveText}>
                Simpan {pending.length} perubahan
              </Text>
            )}
          </Pressable>
        </View>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  legend: { flexDirection: "row", flexWrap: "wrap", gap: 14, marginBottom: 10 },
  legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: 12, fontFamily: "Poppins_500Medium", color: "#6b7280" },
  hint: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#9ca3af",
    marginBottom: 16,
    lineHeight: 18,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    marginBottom: 10,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
  },
  cardLeft: { flexDirection: "row", alignItems: "center", gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 14,
    backgroundColor: "#eff6ff",
    justifyContent: "center",
    alignItems: "center",
  },
  roleName: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#111827" },
  roleMeta: { fontSize: 12, fontFamily: "Poppins_400Regular", color: "#6b7280" },
  permList: { borderTopWidth: 1, borderTopColor: "#f3f4f6" },
  permRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 11,
    borderBottomWidth: 1,
    borderBottomColor: "#f9fafb",
  },
  permLabel: { fontSize: 13, fontFamily: "Poppins_400Regular", color: "#374151" },
  permRight: { flexDirection: "row", alignItems: "center", gap: 8 },
  changedDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: "#2563eb",
  },
  accessBadge: {
    minWidth: 62,
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  accessText: { fontSize: 11, fontFamily: "Poppins_600SemiBold" },
  saveBar: { flexDirection: "row", gap: 12, marginTop: 8 },
  discardBtn: {
    flex: 1,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },
  discardText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#6b7280" },
  saveBtn: {
    flex: 2,
    borderRadius: 14,
    paddingVertical: 14,
    alignItems: "center",
    backgroundColor: "#2563eb",
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveText: { fontSize: 15, fontFamily: "Poppins_600SemiBold", color: "#fff" },
});
