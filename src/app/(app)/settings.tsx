import { ErrorState, LoadingState } from "@/components/QueryStates";
import { useSettings, useUpdateSettings } from "@/hooks/useSettings";
import { extractFieldErrors } from "@/services/api";
import { type SettingsInput } from "@/services/settingsApi";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

/**
 * Hanya field yang benar-benar disentuh user yang disimpan di state.
 * `confidence_threshold` sengaja string karena berasal dari TextInput.
 */
type Draft = Partial<{
  app_name: string;
  timezone: string;
  confidence_threshold: string;
  auto_retrain: boolean;
  email_alerts: boolean;
  auto_reject_on_damage: boolean;
  camera_source: "webcam" | "icam";
  icam_rtsp_url: string;
}>;

export default function SettingsScreen() {
  const query = useSettings();
  const updateSettings = useUpdateSettings();

  // Draft ditumpangkan di atas data server, bukan disalin ke state lewat
  // useEffect. Dengan begitu tidak ada sinkronisasi yang bisa basi ketika
  // server mengirim data baru, dan tidak ada setState di dalam effect.
  const [draft, setDraft] = useState<Draft>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  if (query.isError) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <ErrorState error={query.error} onRetry={() => void query.refetch()} />
      </ScrollView>
    );
  }

  const settings = query.data;
  if (!settings) {
    return (
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <LoadingState label="Memuat pengaturan..." />
      </ScrollView>
    );
  }

  // Nilai yang ditampilkan: draft user kalau ada, kalau tidak nilai server.
  const form = {
    app_name: draft.app_name ?? settings.app_name,
    timezone: draft.timezone ?? settings.timezone,
    confidence_threshold:
      draft.confidence_threshold ?? String(settings.confidence_threshold),
    auto_retrain: draft.auto_retrain ?? settings.auto_retrain,
    email_alerts: draft.email_alerts ?? settings.email_alerts,
    auto_reject_on_damage:
      draft.auto_reject_on_damage ?? settings.auto_reject_on_damage,
    camera_source: draft.camera_source ?? settings.camera_source,
    icam_rtsp_url: draft.icam_rtsp_url ?? (settings.icam_rtsp_url ?? ""),
  };

  const isDirty = Object.keys(draft).length > 0;

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) => {
    setDraft((d) => ({ ...d, [key]: value }));
    setSavedAt(null);
  };

  const handleSave = async () => {
    setFieldErrors({});
    setFormError(null);

    // Update bersifat parsial — kirim hanya field yang benar-benar diubah.
    const payload: SettingsInput = {};

    if (draft.app_name !== undefined) payload.app_name = draft.app_name.trim();
    if (draft.timezone !== undefined) payload.timezone = draft.timezone.trim();
    if (draft.auto_retrain !== undefined) payload.auto_retrain = draft.auto_retrain;
    if (draft.email_alerts !== undefined) payload.email_alerts = draft.email_alerts;
    if (draft.auto_reject_on_damage !== undefined) {
      payload.auto_reject_on_damage = draft.auto_reject_on_damage;
    }
    if (draft.camera_source !== undefined) {
      payload.camera_source = draft.camera_source;
    }
    if (draft.icam_rtsp_url !== undefined) {
      payload.icam_rtsp_url = draft.icam_rtsp_url.trim() || null;
    }

    if (draft.confidence_threshold !== undefined) {
      const threshold = Number.parseFloat(draft.confidence_threshold);
      if (Number.isNaN(threshold) || threshold < 0.5 || threshold > 1) {
        setFieldErrors({
          confidence_threshold: "Nilai harus angka antara 0.5 dan 1.",
        });
        return;
      }
      payload.confidence_threshold = threshold;
    }

    try {
      await updateSettings.mutateAsync(payload);
      setDraft({});
      setSavedAt(new Date().toLocaleTimeString("id-ID"));
    } catch (error) {
      const serverErrors = extractFieldErrors(error);
      if (Object.keys(serverErrors).length > 0) {
        setFieldErrors(serverErrors);
      }
      setFormError(
        error instanceof Error ? error.message : "Gagal menyimpan pengaturan.",
      );
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Umum</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Nama Aplikasi</Text>
            <TextInput
              style={[styles.input, fieldErrors.app_name && styles.inputError]}
              value={form.app_name}
              onChangeText={(t) => set("app_name", t)}
              placeholderTextColor="#9ca3af"
            />
            {fieldErrors.app_name ? (
              <Text style={styles.fieldError}>{fieldErrors.app_name}</Text>
            ) : null}
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Zona Waktu</Text>
            <TextInput
              style={[styles.input, fieldErrors.timezone && styles.inputError]}
              value={form.timezone}
              onChangeText={(t) => set("timezone", t)}
              placeholder="Asia/Jakarta"
              placeholderTextColor="#9ca3af"
              autoCapitalize="none"
            />
            {fieldErrors.timezone ? (
              <Text style={styles.fieldError}>{fieldErrors.timezone}</Text>
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Deteksi</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Confidence Threshold (0.5 – 1)</Text>
            <TextInput
              style={[
                styles.input,
                fieldErrors.confidence_threshold && styles.inputError,
              ]}
              value={form.confidence_threshold}
              onChangeText={(t) => set("confidence_threshold", t)}
              keyboardType="decimal-pad"
              placeholder="0.85"
              placeholderTextColor="#9ca3af"
            />
            {fieldErrors.confidence_threshold ? (
              <Text style={styles.fieldError}>
                {fieldErrors.confidence_threshold}
              </Text>
            ) : null}
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Sumber Kamera</Text>
            <View style={styles.chipRow}>
              {(["webcam", "icam"] as const).map((source) => (
                <Pressable
                  key={source}
                  style={[
                    styles.chip,
                    form.camera_source === source && styles.chipActive,
                  ]}
                  onPress={() => set("camera_source", source)}
                >
                  <Text
                    style={[
                      styles.chipText,
                      form.camera_source === source && styles.chipTextActive,
                    ]}
                  >
                    {source === "webcam" ? "Webcam" : "ICAM-300"}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>

          {form.camera_source === "icam" ? (
            <View style={styles.field}>
              <Text style={styles.label}>URL RTSP ICAM</Text>
              <TextInput
                style={[styles.input, fieldErrors.icam_rtsp_url && styles.inputError]}
                value={form.icam_rtsp_url}
                onChangeText={(t) => set("icam_rtsp_url", t)}
                placeholder="rtsp://..."
                placeholderTextColor="#9ca3af"
                autoCapitalize="none"
              />
              {fieldErrors.icam_rtsp_url ? (
                <Text style={styles.fieldError}>{fieldErrors.icam_rtsp_url}</Text>
              ) : null}
            </View>
          ) : null}

          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Auto-Reject saat Cacat</Text>
              <Text style={styles.switchDesc}>
                Lengan otomatis membuang produk cacat ke zona return
              </Text>
            </View>
            <Switch
              value={form.auto_reject_on_damage}
              onValueChange={(v) => set("auto_reject_on_damage", v)}
              trackColor={{ true: "#2563eb" }}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Training</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Auto Retrain</Text>
              <Text style={styles.switchDesc}>
                Otomatis melatih ulang model saat dataset bertambah
              </Text>
            </View>
            <Switch
              value={form.auto_retrain}
              onValueChange={(v) => set("auto_retrain", v)}
              trackColor={{ true: "#2563eb" }}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifikasi</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View style={{ flex: 1 }}>
              <Text style={styles.switchLabel}>Email Alert</Text>
              <Text style={styles.switchDesc}>
                Kirim email saat terjadi anomali atau training selesai
              </Text>
            </View>
            <Switch
              value={form.email_alerts}
              onValueChange={(v) => set("email_alerts", v)}
              trackColor={{ true: "#2563eb" }}
            />
          </View>
        </View>
      </View>

      {formError ? (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={18} color="#dc2626" />
          <Text style={styles.errorText}>{formError}</Text>
        </View>
      ) : null}

      {savedAt ? (
        <View style={styles.successBox}>
          <Ionicons name="checkmark-circle-outline" size={18} color="#16a34a" />
          <Text style={styles.successText}>Tersimpan pukul {savedAt}</Text>
        </View>
      ) : null}

      <Pressable
        style={[
          styles.saveBtn,
          (updateSettings.isPending || !isDirty) && styles.saveBtnDisabled,
        ]}
        onPress={handleSave}
        disabled={updateSettings.isPending || !isDirty}
      >
        {updateSettings.isPending ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.saveText}>
            {isDirty ? "Simpan Pengaturan" : "Tidak ada perubahan"}
          </Text>
        )}
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 13,
    fontFamily: "Poppins_600SemiBold",
    color: "#6b7280",
    marginBottom: 8,
    textTransform: "uppercase",
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    gap: 16,
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
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 15,
    fontFamily: "Poppins_400Regular",
    color: "#111827",
  },
  inputError: { borderColor: "#dc2626" },
  fieldError: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#dc2626",
  },
  chipRow: { flexDirection: "row", gap: 8 },
  chip: {
    paddingHorizontal: 16,
    paddingVertical: 9,
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
    gap: 12,
  },
  switchLabel: { fontSize: 14, fontFamily: "Poppins_600SemiBold", color: "#111827" },
  switchDesc: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#6b7280",
    marginTop: 2,
    lineHeight: 17,
  },
  errorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#fce7e7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  errorText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#dc2626",
  },
  successBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "#dcfce7",
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    marginBottom: 12,
  },
  successText: {
    flex: 1,
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#16a34a",
  },
  saveBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveBtnDisabled: { opacity: 0.7 },
  saveText: { fontSize: 16, fontFamily: "Poppins_600SemiBold", color: "#fff" },
});
