import { View, Text, StyleSheet } from "react-native";

type StatusBadgeProps = {
  status: string;
};

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pass: { bg: "#dcfce7", text: "#16a34a" },
  passed: { bg: "#dcfce7", text: "#16a34a" },
  ok: { bg: "#dcfce7", text: "#16a34a" },
  good: { bg: "#dcfce7", text: "#16a34a" },
  success: { bg: "#dcfce7", text: "#16a34a" },
  fail: { bg: "#fce7e7", text: "#dc2626" },
  error: { bg: "#fce7e7", text: "#dc2626" },
  damaged: { bg: "#fce7e7", text: "#dc2626" },
  reject: { bg: "#fce7e7", text: "#dc2626" },
  scratched: { bg: "#ffedd5", text: "#ea580c" },
  unreadable: { bg: "#fef9c3", text: "#ca8a04" },
  warning: { bg: "#fef9c3", text: "#ca8a04" },
  pending: { bg: "#fef9c3", text: "#ca8a04" },
  recheck: { bg: "#dbeafe", text: "#2563eb" },
  returned: { bg: "#fce7f3", text: "#e11d48" },
  running: { bg: "#dbeafe", text: "#2563eb" },
  active: { bg: "#dbeafe", text: "#2563eb" },
  inactive: { bg: "#f3f4f6", text: "#6b7280" },
  complete: { bg: "#dcfce7", text: "#16a34a" },
  completed: { bg: "#dcfce7", text: "#16a34a" },
  idle: { bg: "#f3f4f6", text: "#6b7280" },
};

export default function StatusBadge({ status }: StatusBadgeProps) {
  const normalized = status.toLowerCase();
  const colors = STATUS_COLORS[normalized] || { bg: "#f3f4f6", text: "#6b7280" };

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }]}>
      <Text style={[styles.text, { color: colors.text }]}>{status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 99,
    alignSelf: "flex-start",
  },
  text: {
    fontSize: 12,
    fontFamily: "Poppins_600SemiBold",
    textTransform: "capitalize",
  },
});
