import { Ionicons } from "@expo/vector-icons";
import { router, useFocusEffect } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { FormInput } from "@/components/form-input";
import { StatusBadge } from "@/components/status-badge";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, shared, spacing } from "@/lib/styles";

function AvatarInitial({ username }: { username: string }) {
  return (
    <View style={shared.iconCircle}>
      <Text style={{ fontSize: 16, fontWeight: "700", color: colors.primary }}>{username[0]?.toUpperCase()}</Text>
    </View>
  );
}

export default function FriendsScreen() {
  const { token, username: myUsername } = useAuth();
  const [friends, setFriends] = useState<api.Friend[]>([]);
  const [incoming, setIncoming] = useState<api.FriendRequest[]>([]);
  const [outgoing, setOutgoing] = useState<api.FriendRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [query, setQuery] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [sendNotice, setSendNotice] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const [friendsList, requests] = await Promise.all([
        api.listFriends(token),
        api.listFriendRequests(token),
      ]);
      setFriends(friendsList);
      setIncoming(requests.incoming);
      setOutgoing(requests.outgoing);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        router.replace("/login");
        return;
      }
      setLoadError(err instanceof ApiError ? err.message : "No se pudieron cargar tus amigos");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleSendRequest() {
    if (!token) return;
    const username = query.trim();
    if (!username) return;
    setSendError(null);
    setSendNotice(null);
    setSending(true);
    try {
      const result = await api.sendFriendRequest(token, username);
      setQuery("");
      setSendNotice(result.status === "accepted" ? "¡Ya sois amigos!" : "Solicitud enviada");
      await load();
    } catch (err) {
      setSendError(err instanceof ApiError ? err.message : "No se pudo enviar la solicitud");
    } finally {
      setSending(false);
    }
  }

  async function handleAccept(requestId: string) {
    if (!token) return;
    try {
      await api.acceptFriendRequest(token, requestId);
      await load();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "No se pudo aceptar la solicitud");
    }
  }

  async function handleReject(requestId: string) {
    if (!token) return;
    try {
      await api.rejectFriendRequest(token, requestId);
      await load();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "No se pudo rechazar la solicitud");
    }
  }

  async function handleRemoveFriend(friendshipId: string) {
    if (!token) return;
    try {
      await api.removeFriendship(token, friendshipId);
      await load();
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "No se pudo eliminar la amistad");
    }
  }

  if (loading && friends.length === 0 && incoming.length === 0 && outgoing.length === 0) {
    return (
      <View style={shared.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={shared.screen}>
      <Text style={shared.eyebrow}>Comparte con quien quieras</Text>
      <Text style={shared.title}>Amigos</Text>
      <Text style={shared.subtitle}>
        Añade amigos por su nombre de usuario: una vez aceptan, podéis ver las listas del otro directamente desde
        la app.
        {myUsername ? ` Tu usuario es @${myUsername}.` : ""}
      </Text>

      {loadError && (
        <TouchableOpacity onPress={load}>
          <Text style={[shared.errorText, { textAlign: "center" }]}>{loadError} · Reintentar</Text>
        </TouchableOpacity>
      )}

      <View style={{ flexDirection: "row", gap: spacing.sm, alignItems: "center", marginTop: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <FormInput
            icon="at-outline"
            value={query}
            onChangeText={(text) => {
              setQuery(text);
              setSendError(null);
              setSendNotice(null);
            }}
            autoCapitalize="none"
            placeholder="Usuario de tu amigo"
            onSubmitEditing={handleSendRequest}
          />
        </View>
        <TouchableOpacity
          style={[shared.iconCircle, !query.trim() || sending ? null : { backgroundColor: colors.primary }]}
          onPress={handleSendRequest}
          disabled={!query.trim() || sending}
        >
          {sending ? (
            <ActivityIndicator size="small" color={colors.primary} />
          ) : (
            <Ionicons name="add" size={22} color={query.trim() ? colors.primaryText : colors.textFaint} />
          )}
        </TouchableOpacity>
      </View>
      {sendError && <Text style={shared.errorText}>{sendError}</Text>}
      {sendNotice && <Text style={{ color: colors.success, marginTop: 4 }}>{sendNotice}</Text>}

      {incoming.length > 0 && (
        <View style={{ marginTop: spacing.lg }}>
          <Text style={shared.label}>Solicitudes recibidas</Text>
          {incoming.map((request) => (
            <View
              key={request.id}
              style={[shared.card, { flexDirection: "row", alignItems: "center", gap: spacing.md }]}
            >
              <AvatarInitial username={request.username} />
              <Text style={{ flex: 1, fontWeight: "700", color: colors.text }} numberOfLines={1}>
                @{request.username}
              </Text>
              <TouchableOpacity onPress={() => handleAccept(request.id)} hitSlop={10} style={{ padding: 4 }}>
                <Ionicons name="checkmark-circle" size={26} color={colors.success} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => handleReject(request.id)} hitSlop={10} style={{ padding: 4 }}>
                <Ionicons name="close-circle" size={26} color={colors.textFaint} />
              </TouchableOpacity>
            </View>
          ))}
        </View>
      )}

      <View style={{ marginTop: spacing.lg }}>
        <Text style={shared.label}>Tus amigos</Text>
        {friends.length === 0 && outgoing.length === 0 ? (
          <View style={{ alignItems: "center", marginTop: 20 }}>
            <Text style={{ fontSize: 40, marginBottom: spacing.sm }}>👋</Text>
            <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
              Todavía no has añadido a ningún amigo.
            </Text>
          </View>
        ) : (
          <>
            {friends.map((friend) => (
              <TouchableOpacity
                key={friend.friendship_id}
                style={[shared.card, { flexDirection: "row", alignItems: "center", gap: spacing.md }]}
                onPress={() =>
                  router.push({
                    pathname: "/friends/[friendId]",
                    params: { friendId: friend.user_id, username: friend.username },
                  })
                }
                activeOpacity={0.7}
              >
                <AvatarInitial username={friend.username} />
                <Text style={{ flex: 1, fontWeight: "700", color: colors.text }} numberOfLines={1}>
                  @{friend.username}
                </Text>
                <TouchableOpacity
                  onPress={() => handleRemoveFriend(friend.friendship_id)}
                  hitSlop={10}
                  style={{ padding: 4 }}
                >
                  <Ionicons name="close" size={18} color={colors.textFaint} />
                </TouchableOpacity>
                <Ionicons name="chevron-forward" size={18} color={colors.textFaint} />
              </TouchableOpacity>
            ))}
            {outgoing.map((request) => (
              <View
                key={request.id}
                style={[shared.card, { flexDirection: "row", alignItems: "center", gap: spacing.md }]}
              >
                <AvatarInitial username={request.username} />
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontWeight: "700", color: colors.text }} numberOfLines={1}>
                    @{request.username}
                  </Text>
                  <StatusBadge label="Invitación pendiente" tone="accent" icon="time-outline" />
                </View>
                <TouchableOpacity onPress={() => handleReject(request.id)} hitSlop={10} style={{ padding: 4 }}>
                  <Ionicons name="close" size={18} color={colors.textFaint} />
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </View>
    </ScrollView>
  );
}
