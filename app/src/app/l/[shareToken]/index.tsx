import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Text, TouchableOpacity, View } from "react-native";
import { FormInput } from "@/components/form-input";
import { ProgressBar } from "@/components/progress-bar";
import { StatusBadge } from "@/components/status-badge";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { formatEventDate } from "@/lib/date";
import { OCCASION_EMOJI, OCCASION_LABELS } from "@/lib/occasions";
import { colors, shared, spacing } from "@/lib/styles";

function ActionForm({
  item,
  onReserve,
  onContribute,
}: {
  item: api.VisitorItem;
  onReserve: (alias: string) => Promise<void>;
  onContribute: (alias: string, amount: number) => Promise<void>;
}) {
  const [alias, setAlias] = useState("");
  const [amount, setAmount] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setError(null);
    if (!alias.trim()) {
      setError("Indica tu nombre o apodo");
      return;
    }
    setBusy(true);
    try {
      if (item.is_group_gift) {
        const amountNumber = Number(amount);
        if (!amountNumber || amountNumber <= 0) {
          setError("Indica una cantidad válida");
          setBusy(false);
          return;
        }
        await onContribute(alias.trim(), amountNumber);
      } else {
        await onReserve(alias.trim());
      }
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo completar la acción");
    } finally {
      setBusy(false);
    }
  }

  return (
    <View style={{ marginTop: spacing.md, gap: spacing.sm, paddingTop: spacing.md, borderTopWidth: 1, borderTopColor: colors.border }}>
      <FormInput icon="person-outline" value={alias} onChangeText={setAlias} placeholder="Tu nombre o apodo" />
      {item.is_group_gift && (
        <FormInput
          icon="cash-outline"
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder={`¿Cuánto aportas? (quedan ${item.group_gift?.remaining ?? "?"})`}
        />
      )}
      {error && <Text style={shared.errorText}>{error}</Text>}
      <TouchableOpacity style={[shared.button, { marginTop: 0 }]} onPress={submit} disabled={busy}>
        <Text style={shared.buttonText}>
          {busy ? "Enviando..." : item.is_group_gift ? "🎉 Aportar" : "🎁 ¡Voy a regalar esto!"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

export default function VisitorListScreen() {
  const { shareToken } = useLocalSearchParams<{ shareToken: string }>();
  const [list, setList] = useState<api.VisitorList | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeItemId, setActiveItemId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      setList(await api.getListByShareToken(shareToken));
    } catch (err) {
      setLoadError(
        err instanceof ApiError && err.status === 410
          ? "Este enlace ha caducado."
          : "No hemos encontrado esta lista."
      );
    } finally {
      setLoading(false);
    }
  }, [shareToken]);

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

  if (loadError || !list) {
    return (
      <View style={shared.center}>
        <Text style={{ fontSize: 40, marginBottom: spacing.md }}>😕</Text>
        <Text style={{ color: colors.textSecondary }}>{loadError}</Text>
      </View>
    );
  }

  return (
    <View style={shared.screen}>
      <View style={{ alignItems: "center", marginBottom: spacing.lg }}>
        <Text style={{ fontSize: 40 }}>{OCCASION_EMOJI[list.occasion_type]}</Text>
        <Text style={[shared.title, { textAlign: "center", marginTop: spacing.xs }]}>{list.title}</Text>
        <Text style={{ color: colors.textSecondary }}>
          {OCCASION_LABELS[list.occasion_type]}
          {formatEventDate(list.event_date) ? ` · ${formatEventDate(list.event_date)}` : ""}
        </Text>
      </View>

      <FlatList
        data={list.items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ paddingBottom: 20 }}
        ListEmptyComponent={
          <View style={{ alignItems: "center", marginTop: 40 }}>
            <Text style={{ fontSize: 40, marginBottom: spacing.sm }}>🎁</Text>
            <Text style={{ color: colors.textSecondary, textAlign: "center" }}>
              Esta lista todavía no tiene artículos.
            </Text>
          </View>
        }
        renderItem={({ item }) => {
          const isTaken = !item.is_group_gift && item.status === "reserved";
          return (
            <View style={[shared.card, isTaken && { opacity: 0.6 }]}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
                {item.image_url ? (
                  <Image source={{ uri: item.image_url }} style={{ width: 56, height: 56, borderRadius: 14 }} />
                ) : (
                  <View
                    style={{
                      width: 56,
                      height: 56,
                      borderRadius: 14,
                      backgroundColor: colors.card,
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Ionicons name="gift-outline" size={24} color={colors.textFaint} />
                  </View>
                )}
                <View style={{ flex: 1, gap: 4 }}>
                  <Text style={{ fontWeight: "700", color: colors.text }} numberOfLines={2}>
                    {item.title}
                  </Text>
                  {item.price != null && (
                    <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                      {item.price} {item.currency ?? ""}
                    </Text>
                  )}
                  {item.notes && (
                    <Text style={{ color: colors.textSecondary, fontSize: 12, fontStyle: "italic" }} numberOfLines={1}>
                      {item.notes}
                    </Text>
                  )}
                  {!item.is_group_gift && item.status === "reserved" && (
                    <StatusBadge label={`Ya lo lleva ${item.reserver_alias}`} tone="success" icon="checkmark-circle" />
                  )}
                  {item.is_group_gift && <StatusBadge label="Bote común" tone="accent" icon="people-outline" />}
                </View>
                {(item.is_group_gift || item.status === "available") && (
                  <TouchableOpacity
                    onPress={() => setActiveItemId(activeItemId === item.id ? null : item.id)}
                    style={[
                      shared.chip,
                      { backgroundColor: item.is_group_gift ? colors.accentSoft : colors.primarySoft },
                    ]}
                  >
                    <Text style={[shared.chipText, { color: item.is_group_gift ? "#9C6B0A" : colors.primaryDark }]}>
                      {item.is_group_gift ? "Aportar" : "Reservar"}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {item.is_group_gift && item.group_gift && (
                <View style={{ marginTop: spacing.md }}>
                  <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: 6 }}>
                    <Text style={{ fontSize: 12, color: colors.textSecondary, fontWeight: "600" }}>
                      Aportado: {item.group_gift.total_contributed}
                      {item.price != null ? ` de ${item.price}` : ""}
                    </Text>
                  </View>
                  <ProgressBar
                    progress={item.price ? item.group_gift.total_contributed / item.price : 0}
                    color={colors.accent}
                  />
                </View>
              )}

              {activeItemId === item.id && (
                <ActionForm
                  item={item}
                  onReserve={async (alias) => {
                    await api.reserveItem(shareToken, item.id, alias);
                    setActiveItemId(null);
                    load();
                  }}
                  onContribute={async (alias, amount) => {
                    await api.contributeToItem(shareToken, item.id, alias, amount);
                    setActiveItemId(null);
                    load();
                  }}
                />
              )}
            </View>
          );
        }}
      />
    </View>
  );
}
