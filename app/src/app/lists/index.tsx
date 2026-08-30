import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, FlatList, Text, TouchableOpacity, View } from "react-native";
import * as api from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { OCCASION_LABELS } from "@/lib/occasions";
import { colors, shared } from "@/lib/styles";

export default function ListsScreen() {
  const { token, logout } = useAuth();
  const [lists, setLists] = useState<api.ListSummary[] | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      setLists(await api.listLists(token));
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
      <FlatList
        data={lists ?? []}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={{ color: colors.textSecondary, textAlign: "center", marginTop: 40 }}>
            Aún no tienes listas. Crea la primera.
          </Text>
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
