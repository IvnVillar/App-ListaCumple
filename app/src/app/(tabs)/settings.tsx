import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { router } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, Alert, Text, TouchableOpacity, View } from "react-native";
import { FormInput } from "@/components/form-input";
import { PrimaryButton } from "@/components/primary-button";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { colors, fonts, shared, spacing } from "@/lib/styles";

export default function SettingsScreen() {
  const { email, username, logout, updateUsername, deleteAccount } = useAuth();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const usernameValid = /^[a-zA-Z0-9_]{3,20}$/.test(draft.trim());

  async function handleLogout() {
    await logout();
    router.replace("/login");
  }

  function confirmDeleteAccount() {
    Alert.alert(
      "Eliminar tu cuenta",
      "Se borrarán tu cuenta, tus listas y todo lo que hay en ellas. Esto no se puede deshacer.",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: async () => {
            setDeleting(true);
            try {
              await deleteAccount();
              router.replace("/login");
            } catch {
              Alert.alert("No se pudo eliminar la cuenta", "Inténtalo de nuevo en unos segundos.");
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  }

  function startEditing() {
    setDraft(username ?? "");
    setError(null);
    setEditing(true);
  }

  async function handleSaveUsername() {
    if (!usernameValid) return;
    setSaving(true);
    setError(null);
    try {
      await updateUsername(draft.trim());
      setEditing(false);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cambiar el usuario");
    } finally {
      setSaving(false);
    }
  }

  return (
    <View style={shared.screen}>
      <Text style={[shared.title, { marginTop: spacing.lg }]}>Ajustes</Text>

      <View style={[shared.card, { flexDirection: "row", alignItems: "center", gap: spacing.md }]}>
        <View style={shared.iconCircle}>
          <Ionicons name="person-outline" size={20} color={colors.primary} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 12, color: colors.textSecondary }}>Sesión iniciada como</Text>
          <Text style={{ fontFamily: fonts.bold, color: colors.text }} numberOfLines={1}>
            {email ?? "—"}
          </Text>
        </View>
      </View>

      <View style={shared.card}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
          <View style={shared.iconCircle}>
            <Ionicons name="at-outline" size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 12, color: colors.textSecondary }}>Tu usuario (para que te añadan)</Text>
            {!editing && (
              <Text style={{ fontFamily: fonts.bold, color: colors.text }} numberOfLines={1}>
                {username ? `@${username}` : "—"}
              </Text>
            )}
          </View>
          {!editing && (
            <TouchableOpacity onPress={startEditing} hitSlop={10} style={{ padding: 4 }}>
              <Ionicons name="pencil-outline" size={18} color={colors.textFaint} />
            </TouchableOpacity>
          )}
        </View>

        {editing && (
          <View style={{ marginTop: spacing.sm, gap: spacing.sm }}>
            <FormInput
              icon="at-outline"
              value={draft}
              onChangeText={setDraft}
              autoCapitalize="none"
              placeholder="Nuevo usuario"
            />
            {error && <Text style={shared.errorText}>{error}</Text>}
            <View style={{ flexDirection: "row", gap: spacing.sm }}>
              <PrimaryButton
                label="Guardar"
                onPress={handleSaveUsername}
                loading={saving}
                disabled={!usernameValid}
                style={{ flex: 1, marginTop: 0 }}
              />
              <TouchableOpacity
                style={[shared.secondaryButton, { flex: 1 }]}
                onPress={() => setEditing(false)}
                disabled={saving}
              >
                <Text style={shared.secondaryButtonText}>Cancelar</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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

      <View style={{ marginTop: spacing.xxl, alignItems: "center", gap: spacing.sm }}>
        <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(`${API_BASE_URL}/privacy`)}>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Política de privacidad</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(`${API_BASE_URL}/terms`)}>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>Términos de servicio</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={{ marginTop: spacing.xl, alignItems: "center", paddingVertical: spacing.sm }}
        onPress={confirmDeleteAccount}
        disabled={deleting}
      >
        {deleting ? (
          <ActivityIndicator color={colors.danger} />
        ) : (
          <Text style={{ color: colors.danger, fontSize: 13, fontFamily: fonts.semiBold }}>Eliminar mi cuenta</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}
