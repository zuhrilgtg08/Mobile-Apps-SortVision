import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

type StatCardProps = {
  title: string;
  value: string | number;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  subtitle?: string;
  delta?: { value: string; positive: boolean };
};

export default function StatCard({ title, value, icon, color, subtitle, delta }: StatCardProps) {
  return (
    <View style={[styles.card, { borderLeftColor: color, borderLeftWidth: 3 }]}>
      <View style={styles.header}>
        <View style={[styles.iconWrap, { backgroundColor: color + "20" }]}>
          <Ionicons name={icon} size={20} color={color} />
        </View>
        {delta && (
          <View style={[styles.delta, { backgroundColor: delta.positive ? "#dcfce7" : "#fce7e7" }]}>
            <Text style={[styles.deltaText, { color: delta.positive ? "#16a34a" : "#dc2626" }]}>
              {delta.positive ? "↑" : "↓"} {delta.value}
            </Text>
          </View>
        )}
      </View>
      <Text style={styles.value}>{value}</Text>
      <Text style={styles.title}>{title}</Text>
      {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
    flex: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  delta: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 99,
  },
  deltaText: {
    fontSize: 11,
    fontFamily: "Poppins_600SemiBold",
  },
  value: {
    fontSize: 28,
    fontFamily: "Poppins_700Bold",
    color: "#111827",
    marginBottom: 4,
  },
  title: {
    fontSize: 13,
    fontFamily: "Poppins_500Medium",
    color: "#6b7280",
  },
  subtitle: {
    fontSize: 11,
    fontFamily: "Poppins_400Regular",
    color: "#9ca3af",
    marginTop: 2,
  },
});
