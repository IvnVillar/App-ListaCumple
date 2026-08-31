import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
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
  const { shareIntent, resetShareIntent } = useShareIntentContext();
  const [lists, setLists] = useState<api.ListSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const sharedUrl = shareIntent.webUrl ?? (shareIntent.text?.startsWith("http") ? shareIntent.text : null);

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
        <Text style={shared.errorText}>No se ha reconocido ningún enlace en lo compartido.</Text>
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

      <TouchableOpacity
        style={shared.secondaryButton}
        onPress={() => {
          resetShareIntent(false);
          router.replace("/lists");
        }}
      >
        <Text style={shared.secondaryButtonText}>Cancelar</Text>
      </TouchableOpacity>
    </View>
  );
}
