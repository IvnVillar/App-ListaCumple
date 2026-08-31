import { router } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { OCCASION_LABELS } from "@/lib/occasions";
import { useShareIntentContext } from "@/lib/shareIntent";
import { colors, shared } from "@/lib/styles";

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
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={shared.screen}>
      <Text style={shared.title}>¿A qué lista lo añades?</Text>
      {sharedUrl ? (
        <Text style={shared.subtitle} numberOfLines={2}>
          {sharedUrl}
        </Text>
      ) : (
        <Text style={shared.errorText}>No se ha reconocido ningún enlace en lo compartido.</Text>
      )}

      {error && <Text style={shared.errorText}>{error}</Text>}

      <FlatList
        data={lists ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={{ color: colors.textSecondary, textAlign: "center", marginTop: 40 }}>
            Aún no tienes listas. Crea una primero.
          </Text>
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={shared.card} onPress={() => pickList(item.id)}>
            <Text style={{ fontSize: 17, fontWeight: "600", color: colors.text }}>{item.title}</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
              {OCCASION_LABELS[item.occasion_type]}
            </Text>
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
