import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Platform,
  Share,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { APP_BASE_URL } from "@/lib/config";
import { formatEventDate } from "@/lib/date";
import { OCCASION_EMOJI, OCCASION_LABELS } from "@/lib/occasions";
import { colors, shared, spacing } from "@/lib/styles";

function shareUrl(shareToken: string): string {
  // El backend (API_BASE_URL) no sirve esta ruta — es una pantalla de la
  // app. En web el propio origen ya es correcto y se adapta solo a
  // cualquier host/puerto real; en nativo no hay window, así que cae al
  // dominio configurado en APP_BASE_URL (el universal link real en producción).
  const base = Platform.OS === "web" && typeof window !== "undefined" ? window.location.origin : APP_BASE_URL;
  return `${base}/l/${shareToken}`;
}

export default function ListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const { token } = useAuth();
  const [list, setList] = useState<api.ListDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      setList(await api.getList(token, listId));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setLoadError(err instanceof ApiError ? err.message : "No se pudo cargar la lista");
    } finally {
      setLoading(false);
    }
  }, [token, listId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleShare() {
    if (!list) return;
    const url = shareUrl(list.share_token);
    if (Platform.OS === "web") {
      try {
        await navigator.clipboard?.writeText(url);
        Alert.alert("Enlace copiado", url);
      } catch {
        Alert.alert("Tu enlace para compartir", url);
      }
    } else {
      await Share.share({ message: `Mira mi lista de deseos: ${url}`, url });
    }
  }

  async function handleDeleteItem(itemId: string) {
    if (!token || !list) return;
    try {
      await api.deleteItem(token, list.id, itemId);
      load();
    } catch (err) {
      Alert.alert("No se pudo eliminar", err instanceof ApiError ? err.message : "Inténtalo de nuevo.");
    }
  }

  if (loading && !list) {
    return (
      <View style={shared.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  if (loadError && !list) {
    return (
      <View style={shared.center}>
        <Text style={{ color: colors.textSecondary, marginBottom: 16 }}>{loadError}</Text>
        <TouchableOpacity style={shared.secondaryButton} onPress={load}>
          <Text style={shared.secondaryButtonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (!list) return null;

  const progress = list.items_total > 0 ? list.items_with_destination / list.items_total : 0;

  return (
    <View style={shared.screen}>
      <TouchableOpacity
        onPress={() => router.back()}
        hitSlop={10}
        style={{ flexDirection: "row", alignItems: "center", marginBottom: spacing.sm }}
      >
        <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
        <Text style={{ color: colors.textSecondary, fontSize: 14 }}>Mis listas</Text>
      </TouchableOpacity>

      <View style={{ flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between" }}>
        <View style={{ flex: 1, paddingRight: spacing.md }}>
          <Text style={{ fontSize: 13, color: colors.textSecondary, marginBottom: 2 }}>
            {OCCASION_EMOJI[list.occasion_type]} {OCCASION_LABELS[list.occasion_type]}
            {formatEventDate(list.event_date) ? ` · ${formatEventDate(list.event_date)}` : ""}
          </Text>
          <Text style={shared.title}>{list.title}</Text>
        </View>
        <TouchableOpacity style={shared.iconCircle} onPress={handleShare}>
          <Ionicons name="share-social-outline" size={19} color={colors.primary} />
        </TouchableOpacity>
      </View>

      <View style={{ marginBottom: spacing.lg }}>
        <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 8 }}>
          <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>
            {list.items_with_destination} de {list.items_total} con destino
          </Text>
        </View>
        <ProgressBar progress={progress} />
      </View>

      <FlatList
        data={list.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 100 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: spacing.sm }}>📝</Text>
            <Text style={{ color: colors.textSecondary, textAlign: "center" }}>Sin artículos todavía.</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[shared.card, { flexDirection: "row", alignItems: "center", gap: spacing.md }]}
            onPress={() => router.push(`/lists/${list.id}/items/${item.id}`)}
            activeOpacity={0.7}
          >
            {item.image_url ? (
              <Image source={{ uri: item.image_url }} style={{ width: 52, height: 52, borderRadius: 12 }} />
            ) : (
              <View
                style={{
                  width: 52,
                  height: 52,
                  borderRadius: 12,
                  backgroundColor: colors.card,
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Ionicons name="gift-outline" size={22} color={colors.textFaint} />
              </View>
            )}
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontWeight: "700", color: colors.text }} numberOfLines={2}>
                {item.title}
              </Text>
              {item.price && (
                <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                  {item.price} {item.currency ?? ""}
                </Text>
              )}
              {item.notes && (
                <Text style={{ color: colors.textSecondary, fontSize: 12, fontStyle: "italic" }} numberOfLines={1}>
                  {item.notes}
                </Text>
              )}
              <View style={{ flexDirection: "row", gap: 6, marginTop: 2, flexWrap: "wrap" }}>
                <StatusBadge
                  label={item.has_destination ? "Ya tiene destino" : "Disponible"}
                  tone={item.has_destination ? "success" : "neutral"}
                  icon={item.has_destination ? "checkmark-circle" : "ellipse-outline"}
                />
                {item.is_group_gift && <StatusBadge label="Bote común" tone="accent" icon="people-outline" />}
              </View>
            </View>
            <TouchableOpacity onPress={() => handleDeleteItem(item.id)} hitSlop={10} style={{ padding: 4 }}>
              <Ionicons name="trash-outline" size={19} color={colors.textFaint} />
            </TouchableOpacity>
          </TouchableOpacity>
        )}
      />

      <TouchableOpacity style={shared.fab} onPress={() => router.push(`/lists/${list.id}/add-item`)} activeOpacity={0.85}>
        <Ionicons name="add" size={30} color={colors.primaryText} />
      </TouchableOpacity>
    </View>
  );
}
