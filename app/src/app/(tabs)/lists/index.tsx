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
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntentContext();
  const [lists, setLists] = useState<api.ListSummary[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  // Alguien compartió un link (share sheet nativo, spec 2.c) mientras la app
  // no estaba abierta: cae directo en "Mis guardados", sin preguntar antes a
  // qué lista añadirlo (guardado sin fricción).
  useEffect(() => {
    if (!hasShareIntent || !token) return;
    const sharedUrl = shareIntent.webUrl || (shareIntent.text?.startsWith("http") ? shareIntent.text : "");
    resetShareIntent(false);
    api
      .getDefaultList(token)
      .then((defaultList) => {
        router.replace({
          pathname: "/lists/[listId]/add-item",
          params: { listId: defaultList.id, url: sharedUrl ?? "" },
        });
      })
      .catch(() => {
        router.replace("/home");
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasShareIntent, token]);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      // Asegura que "Mis guardados" ya exista antes de listar, así aparece
      // siempre fijada arriba incluso si el usuario nunca ha guardado nada.
      await api.getDefaultList(token);
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

  const defaultList = lists?.find((item) => item.is_default) ?? null;
  const eventLists = lists?.filter((item) => !item.is_default) ?? [];

  return (
    <View style={shared.screen}>
      <Text style={shared.eyebrow}>Tus regalos</Text>
      <Text style={shared.title}>Mis listas</Text>

      {loadError && (
        <TouchableOpacity onPress={load}>
          <Text style={[shared.errorText, { textAlign: "center" }]}>{loadError} · Reintentar</Text>
        </TouchableOpacity>
      )}

      {defaultList && (
        <TouchableOpacity
          style={[
            shared.card,
            {
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.md,
              backgroundColor: colors.primarySoft,
              marginTop: spacing.md,
            },
          ]}
          onPress={() => router.push(`/lists/${defaultList.id}`)}
          activeOpacity={0.7}
        >
          <View
            style={{
              width: 48,
              height: 48,
              borderRadius: 16,
              backgroundColor: colors.surface,
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Text style={{ fontSize: 22 }}>📌</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: 16, fontWeight: "700", color: colors.primaryDark }}>{defaultList.title}</Text>
            <Text style={{ color: colors.primaryDark, marginTop: 2, fontSize: 13 }}>
              Todo lo que guardas sin elegir ocasión
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={18} color={colors.primaryDark} />
        </TouchableOpacity>
      )}

      <FlatList
        data={eventLists}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: 100 }}
        ListEmptyComponent={
          !loadError ? (
            <View style={{ alignItems: "center", marginTop: 40 }}>
              <Text style={{ fontSize: 40, marginBottom: spacing.md }}>🎁</Text>
              <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
                Aún no tienes listas para una ocasión concreta (cumpleaños, boda...).
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
