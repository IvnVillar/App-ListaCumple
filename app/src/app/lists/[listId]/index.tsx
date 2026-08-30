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
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { colors, shared } from "@/lib/styles";

function shareUrl(shareToken: string): string {
  return `${API_BASE_URL}/l/${shareToken}`;
}

export default function ListDetailScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const { token } = useAuth();
  const [list, setList] = useState<api.ListDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setList(await api.getList(token, listId));
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
    await api.deleteItem(token, list.id, itemId);
    load();
  }

  if (loading && !list) {
    return (
      <View style={shared.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!list) return null;

  return (
    <View style={shared.screen}>
      <Text style={shared.title}>{list.title}</Text>
      <Text style={shared.subtitle}>
        {list.items_with_destination} de {list.items_total} artículos ya tienen destino
      </Text>

      <FlatList
        data={list.items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={{ color: colors.textSecondary, textAlign: "center", marginTop: 20 }}>
            Sin artículos todavía.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={[shared.card, { flexDirection: "row", alignItems: "center", gap: 12 }]}>
            {item.image_url && (
              <Image source={{ uri: item.image_url }} style={{ width: 48, height: 48, borderRadius: 8 }} />
            )}
            <View style={{ flex: 1 }}>
              <Text style={{ fontWeight: "600", color: colors.text }}>{item.title}</Text>
              {item.price && (
                <Text style={{ color: colors.textSecondary }}>
                  {item.price} {item.currency ?? ""}
                </Text>
              )}
              <Text
                style={{
                  color: item.has_destination ? colors.success : colors.textSecondary,
                  fontSize: 13,
                  marginTop: 2,
                }}
              >
                {item.has_destination ? "Ya tiene destino" : "Disponible"}
                {item.is_group_gift ? " · Bote común" : ""}
              </Text>
            </View>
            <TouchableOpacity onPress={() => handleDeleteItem(item.id)}>
              <Text style={{ color: colors.danger }}>Eliminar</Text>
            </TouchableOpacity>
          </View>
        )}
      />

      <TouchableOpacity style={shared.button} onPress={() => router.push(`/lists/${list.id}/add-item`)}>
        <Text style={shared.buttonText}>+ Añadir artículo</Text>
      </TouchableOpacity>

      <TouchableOpacity style={shared.secondaryButton} onPress={handleShare}>
        <Text style={shared.secondaryButtonText}>Compartir lista</Text>
      </TouchableOpacity>
    </View>
  );
}
