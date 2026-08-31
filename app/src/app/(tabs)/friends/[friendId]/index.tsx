import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { OCCASION_EMOJI, OCCASION_LABELS } from "@/lib/occasions";
import { colors, shared, spacing } from "@/lib/styles";

export default function FriendListsScreen() {
  const { friendId, username } = useLocalSearchParams<{ friendId: string; username?: string }>();
  const { token } = useAuth();
  const [lists, setLists] = useState<api.ListSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      setLists(await api.getFriendLists(token, friendId));
    } catch (err) {
      if (err instanceof ApiError && err.status === 403) {
        setLoadError("Ya no sois amigos");
      } else {
        setLoadError(err instanceof ApiError ? err.message : "No se pudieron cargar sus listas");
      }
    } finally {
      setLoading(false);
    }
  }, [token, friendId]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <View style={shared.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={shared.screen}>
      <Text style={shared.eyebrow}>Listas de</Text>
      <Text style={shared.title}>{username ? `@${username}` : "tu amigo"}</Text>

      {loadError && (
        <TouchableOpacity onPress={load}>
          <Text style={[shared.errorText, { textAlign: "center" }]}>{loadError} · Reintentar</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={lists ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: 40 }}
        ListEmptyComponent={
          !loadError ? (
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Text style={{ fontSize: 48, marginBottom: spacing.md }}>🎁</Text>
              <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
                Todavía no tiene ninguna lista.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[shared.card, { flexDirection: "row", alignItems: "center", gap: spacing.md }]}
            onPress={() => router.push(`/l/${item.share_token}`)}
            activeOpacity={0.7}
          >
            <View
              style={{
                width: 48,
                height: 48,
                borderRadius: 16,
                backgroundColor: colors.card,
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Text style={{ fontSize: 22 }}>{OCCASION_EMOJI[item.occasion_type]}</Text>
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
    </View>
  );
}
