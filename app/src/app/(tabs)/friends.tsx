import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { FormInput } from "@/components/form-input";
import { StatusBadge } from "@/components/status-badge";
import { colors, shared, spacing } from "@/lib/styles";

interface MockFriend {
  id: string;
  label: string;
}

export default function FriendsScreen() {
  const [query, setQuery] = useState("");
  const [friends, setFriends] = useState<MockFriend[]>([]);

  function handleInvite() {
    const trimmed = query.trim();
    if (!trimmed) return;
    setFriends((prev) => [{ id: `${Date.now()}`, label: trimmed }, ...prev]);
    setQuery("");
  }

  function handleRemove(id: string) {
    setFriends((prev) => prev.filter((f) => f.id !== id));
  }

  return (
    <View style={shared.screen}>
      <Text style={shared.eyebrow}>Comparte con quien quieras</Text>
      <Text style={shared.title}>Amigos</Text>
      <Text style={shared.subtitle}>
        Añade amigos para más adelante poder elegir quién ve cada lista, en vez de compartirla con cualquiera que
        tenga el enlace.
      </Text>

      <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center" }}>
        <View style={{ flex: 1 }}>
          <FormInput
            icon="person-add-outline"
            value={query}
            onChangeText={setQuery}
            autoCapitalize="none"
            keyboardType="email-address"
            placeholder="Email o nombre de tu amigo"
            onSubmitEditing={handleInvite}
          />
        </View>
        <TouchableOpacity
          style={[shared.iconCircle, !query.trim() ? null : { backgroundColor: colors.primary }]}
          onPress={handleInvite}
          disabled={!query.trim()}
        >
          <Ionicons name="add" size={22} color={query.trim() ? colors.primaryText : colors.textFaint} />
        </TouchableOpacity>
      </View>

      <FlatList
        data={friends}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingTop: spacing.lg, paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: spacing.sm }}>👋</Text>
            <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
              Todavía no has añadido a ningún amigo.
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <View style={[shared.card, { flexDirection: "row", alignItems: "center", gap: spacing.md }]}>
            <View style={shared.iconCircle}>
              <Text style={{ fontSize: 16, fontWeight: "700", color: colors.primary }}>
                {item.label[0]?.toUpperCase()}
              </Text>
            </View>
            <View style={{ flex: 1, gap: 4 }}>
              <Text style={{ fontWeight: "700", color: colors.text }} numberOfLines={1}>
                {item.label}
              </Text>
              <StatusBadge label="Invitación pendiente" tone="accent" icon="time-outline" />
            </View>
            <TouchableOpacity onPress={() => handleRemove(item.id)} hitSlop={10} style={{ padding: 4 }}>
              <Ionicons name="close" size={18} color={colors.textFaint} />
            </TouchableOpacity>
          </View>
        )}
      />
    </View>
  );
}
