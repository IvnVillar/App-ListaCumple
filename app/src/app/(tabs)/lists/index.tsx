import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { OCCASION_EMOJI, OCCASION_LABELS } from "@/lib/occasions";
import { useShareIntentContext } from "@/lib/shareIntent";
import { colors, shared, spacing } from "@/lib/styles";

export default function ListsScreen() {
  const { token } = useAuth();
  const { hasShareIntent } = useShareIntentContext();
  const [lists, setLists] = useState<api.ListSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Alguien compartió un link (share sheet nativo, spec 2.c) mientras la app
  // no estaba abierta: en vez de aterrizar en "Mis listas", pedimos primero
  // a qué lista añadirlo.
  useEffect(() => {
    if (hasShareIntent) router.replace("/lists/share-target");
  }, [hasShareIntent]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      setLists(await api.listLists(token));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setLoadError(err instanceof ApiError ? err.message : "No se pudieron cargar tus listas");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  if (loading && !lists) {
    return (
      <View style={shared.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <View style={shared.screen}>
      <Text style={shared.eyebrow}>Tus regalos</Text>
      <Text style={shared.title}>Mis listas</Text>

      {loadError && (
        <TouchableOpacity onPress={load}>
          <Text style={[shared.errorText, { textAlign: "center" }]}>{loadError} · Reintentar</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={lists ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: 100 }}
        ListEmptyComponent={
          !loadError ? (
            <View style={{ alignItems: "center", marginTop: 60 }}>
              <Text style={{ fontSize: 48, marginBottom: spacing.md }}>🎁</Text>
              <Text style={{ color: colors.text, fontWeight: "700", fontSize: 16, marginBottom: 4 }}>
                Aún no tienes listas
              </Text>
              <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
                Crea la primera y empieza a añadir cosas que te harían ilusión.
              </Text>
            </View>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[shared.card, { flexDirection: "row", alignItems: "center", gap: spacing.md }]}
            onPress={() => router.push(`/lists/${item.id}`)}
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

      <TouchableOpacity style={shared.fab} onPress={() => router.push("/lists/new")} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color={colors.primaryText} />
      </TouchableOpacity>
    </View>
  );
}
