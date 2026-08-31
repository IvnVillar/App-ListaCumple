import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "@/lib/auth";
import { colors, shared, spacing } from "@/lib/styles";

export default function SettingsScreen() {
  const { email, logout } = useAuth();

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  return (
    <View style={shared.screen}>
      <Text style={shared.eyebrow}>Tu cuenta</Text>
      <Text style={shared.title}>Ajustes</Text>

      <View style={[shared.card, { flexDirection: "row", alignItems: "center", gap: spacing.md }]}>
        <View style={shared.iconCircle}>
          <Ionicons name="person-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Sesión iniciada como</Text>
          <Text style={{ fontWeight: "700", color: colors.text }} numberOfLines={1}>
            {email ?? "—"}
          </Text>
        </View>
      </View>

      <TouchableOpacity
        style={[
          shared.secondaryButton,
          { marginTop: spacing.xl, flexDirection: "row", justifyContent: "center", gap: 8 },
        ]}
        onPress={handleLogout}
      >
        <Ionicons name="log-out-outline" size={18} color={colors.danger} />
        <Text style={[shared.secondaryButtonText, { color: colors.danger }]}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}
