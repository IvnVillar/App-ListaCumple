import { router, useFocusEffect } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { OCCASION_LABELS } from "@/lib/occasions";
import { useShareIntentContext } from "@/lib/shareIntent";
import { colors, shared } from "@/lib/styles";

export default function ListsScreen() {
  const { token, logout } = useAuth();
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
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={shared.screen}>
      {loadError && (
        <TouchableOpacity onPress={load}>
          <Text style={[shared.errorText, { textAlign: "center" }]}>{loadError} · Reintentar</Text>
        </TouchableOpacity>
      )}

      <FlatList
        data={lists ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          !loadError ? (
            <Text style={{ color: colors.textSecondary, textAlign: "center", marginTop: 40 }}>
              Aún no tienes listas. Crea la primera.
            </Text>
          ) : null
        }
        renderItem={({ item }) => (
          <TouchableOpacity style={shared.card} onPress={() => router.push(`/lists/${item.id}`)}>
            <Text style={{ fontSize: 17, fontWeight: "600", color: colors.text }}>{item.title}</Text>
            <Text style={{ color: colors.textSecondary, marginTop: 4 }}>
              {OCCASION_LABELS[item.occasion_type]}
            </Text>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={shared.button} onPress={() => router.push("/lists/new")}>
        <Text style={shared.buttonText}>+ Nueva lista</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={shared.secondaryButton}
        onPress={async () => {
          await logout();
          router.replace("/login");
        }}
      >
        <Text style={shared.secondaryButtonText}>Cerrar sesión</Text>
      </TouchableOpacity>
    </View>
  );
}
