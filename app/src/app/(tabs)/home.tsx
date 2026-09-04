import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FormInput } from "@/components/form-input";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, radius, shared, spacing } from "@/lib/styles";

export default function HomeScreen() {
  const { email, token } = useAuth();
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [activity, setActivity] = useState<api.FriendActivityItem[] | null>(null);
  const [loadingActivity, setLoadingActivity] = useState(true);

  const loadActivity = useCallback(async () => {
    if (!token) return;
    try {
      setActivity(await api.getFriendsActivity(token));
    } catch {
      // El feed de inicio es un extra, no algo crítico — si falla, se queda
      // como estaba en vez de tapar el resto de la pantalla con un error.
    } finally {
      setLoadingActivity(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      loadActivity();
    }, [loadActivity])
  );

  async function handleAdd() {
    const trimmed = url.trim();
    if (!trimmed || !token) return;
    setError(null);
    setSaving(true);
    try {
      const defaultList = await api.getDefaultList(token);
      setUrl("");
      router.push({ pathname: "/lists/[listId]/add-item", params: { listId: defaultList.id, url: trimmed } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el enlace");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={shared.screen} keyboardShouldPersistTaps="handled">
        <Text style={shared.eyebrow}>Hola{email ? ` de nuevo` : ""}</Text>
        <Text style={shared.title}>¿Qué le regalamos?</Text>
        <Text style={shared.subtitle}>Pega el enlace de un producto y se guarda directamente en Mis guardados.</Text>

        <FormInput
          icon="link-outline"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="Pega aquí el enlace de un producto"
          onSubmitEditing={handleAdd}
        />
        {error && <Text style={shared.errorText}>{error}</Text>}
        <TouchableOpacity
          style={[shared.button, (!url.trim() || saving) && shared.buttonDisabled]}
          onPress={handleAdd}
          disabled={!url.trim() || saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={shared.buttonText}>📌 Guardar</Text>
          )}
        </TouchableOpacity>

        <Text style={[shared.label, { marginTop: spacing.xl }]}>Lo último de tus amigos</Text>

        {loadingActivity && activity === null ? (
          <View style={{ paddingVertical: spacing.xl, alignItems: "center" }}>
            <ActivityIndicator color={colors.primary} />
          </View>
        ) : activity && activity.length > 0 ? (
          <View style={{ gap: spacing.sm }}>
            {activity.map((entry) => (
              <TouchableOpacity
                key={entry.item_id}
                style={[shared.card, { flexDirection: "row", alignItems: "center", gap: spacing.md }]}
                onPress={() => router.push(`/l/${entry.list_share_token}`)}
                activeOpacity={0.7}
              >
                {entry.image_url ? (
                  <Image source={{ uri: entry.image_url }} style={{ width: 48, height: 48, borderRadius: 12 }} />
                ) : (
                  <View
                    style={{
                      width: 48,
                      height: 48,
                      borderRadius: 12,
                      backgroundColor: colors.card,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="gift-outline" size={20} color={colors.textFaint} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={{ color: colors.textSecondary, fontSize: 12 }} numberOfLines={1}>
                    @{entry.friend_username} guardó en {entry.list_title}
                  </Text>
                  <Text style={{ fontWeight: "700", color: colors.text }} numberOfLines={1}>
                    {entry.title}
                  </Text>
                  {entry.price != null && (
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {entry.price} {entry.currency ?? ""}
                    </Text>
                  )}
                </View>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </TouchableOpacity>
            ))}
          </View>
        ) : (
          <View
            style={{
              marginTop: spacing.sm,
              alignItems: "center",
              paddingVertical: spacing.xxl,
              borderRadius: radius.lg,
              borderWidth: 1.5,
              borderColor: colors.border,
              borderStyle: "dashed",
            }}
          >
            <Ionicons name="sparkles-outline" size={24} color={colors.textFaint} />
            <Text style={{ color: colors.textSecondary, marginTop: spacing.sm, textAlign: "center" }}>
              Aquí verás lo que tus amigos vayan guardando.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
