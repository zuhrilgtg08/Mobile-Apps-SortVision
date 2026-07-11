import { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from "react-native";

export default function SettingsScreen() {
  const [confidence, setConfidence] = useState("0.85");
  const [model, setModel] = useState("YOLOv8n v2.1");
  const [autoRetrain, setAutoRetrain] = useState(true);
  const [notifications, setNotifications] = useState(true);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Deteksi</Text>
        <View style={styles.card}>
          <View style={styles.field}>
            <Text style={styles.label}>Confidence Threshold</Text>
            <TextInput
              style={styles.input}
              value={confidence}
              onChangeText={setConfidence}
              placeholder="0.85"
              placeholderTextColor="#9ca3af"
            />
          </View>
          <View style={styles.field}>
            <Text style={styles.label}>Active Model</Text>
            <TextInput
              style={styles.input}
              value={model}
              onChangeText={setModel}
              placeholder="YOLOv8n v2.1"
              placeholderTextColor="#9ca3af"
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Training</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Auto Retrain</Text>
              <Text style={styles.switchDesc}>
                Otomatis retrain model setiap minggu
              </Text>
            </View>
            <Switch
              value={autoRetrain}
              onValueChange={setAutoRetrain}
              trackColor={{ true: "#2563eb" }}
            />
          </View>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Notifikasi</Text>
        <View style={styles.card}>
          <View style={styles.switchRow}>
            <View>
              <Text style={styles.switchLabel}>Push Notifications</Text>
              <Text style={styles.switchDesc}>
                Notifikasi deteksi defect dan error sistem
              </Text>
            </View>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ true: "#2563eb" }}
            />
          </View>
        </View>
      </View>

      <Pressable style={styles.saveBtn}>
        <Text style={styles.saveText}>Simpan Pengaturan</Text>
      </Pressable>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  content: { padding: 16, paddingBottom: 32 },
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 16,
    fontFamily: "Poppins_600SemiBold",
    color: "#111827",
    marginBottom: 10,
  },
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 1,
    gap: 16,
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
  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  switchLabel: {
    fontSize: 15,
    fontFamily: "Poppins_500Medium",
    color: "#111827",
  },
  switchDesc: {
    fontSize: 12,
    fontFamily: "Poppins_400Regular",
    color: "#6b7280",
    marginTop: 2,
  },
  saveBtn: {
    backgroundColor: "#2563eb",
    borderRadius: 14,
    paddingVertical: 16,
    alignItems: "center",
  },
  saveText: { color: "#fff", fontSize: 16, fontFamily: "Poppins_600SemiBold" },
});
