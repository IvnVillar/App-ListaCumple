import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { OCCASION_EMOJI, OCCASION_LABELS } from "@/lib/occasions";
import { useShareIntentContext } from "@/lib/shareIntent";
import { colors, shared, spacing } from "@/lib/styles";

export default function ShareTargetScreen() {
  const { token } = useAuth();
  const { url: manualUrl } = useLocalSearchParams<{ url?: string }>();
  const { shareIntent, resetShareIntent } = useShareIntentContext();
  const [lists, setLists] = useState<api.ListSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Llega aquí tanto desde el share sheet nativo (shareIntent) como desde el
  // cuadro de "pegar enlace" de Inicio (parámetro url) — el manual gana si
  // ambos están presentes, aunque en la práctica solo uno lo estará cada vez.
  const sharedUrl = manualUrl || shareIntent.webUrl || (shareIntent.text?.startsWith("http") ? shareIntent.text : null);

  useEffect(() => {
    if (!token) return;
    api
      .listLists(token)
      .then(setLists)
      .catch((err) => setError(err instanceof ApiError ? err.message : "No se pudieron cargar tus listas"))
      .finally(() => setLoading(false));
  }, [token]);

  function pickList(listId: string) {
    resetShareIntent(false);
    router.replace({
      pathname: "/lists/[listId]/add-item",
      params: { listId, url: sharedUrl ?? "" },
    });
  }

  function handleCancel() {
    resetShareIntent(false);
    if (router.canGoBack()) router.back();
    else router.replace("/home");
  }

  if (loading) {
    return (
      <View style={shared.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={shared.screen}>
      <Text style={[shared.subtitle, { marginTop: 4 }]}>Elige a qué lista lo añades.</Text>

      {sharedUrl ? (
        <View
          style={[
            shared.card,
            { flexDirection: "row", alignItems: "center", gap: spacing.sm, backgroundColor: colors.primarySoft },
          ]}
        >
          <Ionicons name="link-outline" size={16} color={colors.primaryDark} />
          <Text style={{ color: colors.primaryDark, fontSize: 13, flex: 1 }} numberOfLines={2}>
            {sharedUrl}
          </Text>
        </View>
      ) : (
        <Text style={shared.errorText}>No se ha reconocido ningún enlace.</Text>
      )}

      {error && <Text style={shared.errorText}>{error}</Text>}

      <FlatList
        data={lists ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: spacing.sm }}
        ListEmptyComponent={
          <Text style={{ color: colors.textSecondary, textAlign: "center", marginTop: 40 }}>
            Aún no tienes listas. Crea una primero.
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[shared.card, { flexDirection: "row", alignItems: "center", gap: spacing.md }]}
            onPress={() => pickList(item.id)}
            activeOpacity={0.7}
          >
            <View
              style={{
                width: 44,
                height: 44,
                borderRadius: 14,
                backgroundColor: colors.card,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 20 }}>{OCCASION_EMOJI[item.occasion_type]}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.text }}>{item.title}</Text>
              <Text style={{ color: colors.textSecondary, marginTop: 2, fontSize: 13 }}>
                {OCCASION_LABELS[item.occasion_type]}
              </Text>
            </View>
            <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={shared.secondaryButton} onPress={handleCancel}>
        <Text style={shared.secondaryButtonText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}
