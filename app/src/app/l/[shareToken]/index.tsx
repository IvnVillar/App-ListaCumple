import { useLocalSearchParams } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, FlatList, Image, Text, TouchableOpacity, View } from "react-native";
import { FormInput } from "@/components/form-input";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { formatEventDate } from "@/lib/date";
import { OCCASION_LABELS } from "@/lib/occasions";
import { colors, shared } from "@/lib/styles";

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
    <View style={{ marginTop: 10, gap: 8 }}>
      <FormInput value={alias} onChangeText={setAlias} placeholder="Tu nombre o apodo" />
      {item.is_group_gift && (
        <FormInput
          value={amount}
          onChangeText={setAmount}
          keyboardType="decimal-pad"
          placeholder={`¿Cuánto aportas? (quedan ${item.group_gift?.remaining ?? "?"})`}
        />
      )}
      {error && <Text style={shared.errorText}>{error}</Text>}
      <TouchableOpacity style={[shared.button, { marginTop: 0 }]} onPress={submit} disabled={busy}>
        <Text style={shared.buttonText}>
          {busy ? "Enviando..." : item.is_group_gift ? "Aportar" : "Voy a regalar esto"}
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
        <ActivityIndicator />
      </View>
    );
  }

  if (loadError || !list) {
    return (
      <View style={shared.center}>
        <Text style={{ color: colors.textSecondary }}>{loadError}</Text>
      </View>
    );
  }

  return (
    <View style={shared.screen}>
      <Text style={shared.title}>{list.title}</Text>
      <Text style={shared.subtitle}>
        {OCCASION_LABELS[list.occasion_type]}
        {formatEventDate(list.event_date) ? ` · ${formatEventDate(list.event_date)}` : ""}
      </Text>

      <FlatList
        data={list.items}
        keyExtractor={(item) => item.id}
        ListEmptyComponent={
          <Text style={{ color: colors.textSecondary, textAlign: "center", marginTop: 40 }}>
            Esta lista todavía no tiene artículos.
          </Text>
        }
        renderItem={({ item }) => (
          <View style={shared.card}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 12 }}>
              {item.image_url && (
                <Image source={{ uri: item.image_url }} style={{ width: 48, height: 48, borderRadius: 8 }} />
              )}
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "600", color: colors.text }}>{item.title}</Text>
                {item.price != null && (
                  <Text style={{ color: colors.textSecondary }}>
                    {item.price} {item.currency ?? ""}
                  </Text>
                )}
                {item.notes && (
                  <Text style={{ color: colors.textSecondary, fontSize: 13, fontStyle: "italic" }}>
                    {item.notes}
                  </Text>
                )}
                {item.is_group_gift && item.group_gift && (
                  <Text style={{ color: colors.textSecondary, fontSize: 13 }}>
                    Aportado: {item.group_gift.total_contributed}
                    {item.price != null ? ` de ${item.price}` : ""}
                  </Text>
                )}
                {!item.is_group_gift && item.status === "reserved" && (
                  <Text style={{ color: colors.success, fontSize: 13 }}>Ya lo lleva {item.reserver_alias}</Text>
                )}
              </View>
              {(item.is_group_gift || item.status === "available") && (
                <TouchableOpacity onPress={() => setActiveItemId(activeItemId === item.id ? null : item.id)}>
                  <Text style={{ color: colors.primary, fontWeight: "600" }}>
                    {item.is_group_gift ? "Aportar" : "Reservar"}
                  </Text>
                </TouchableOpacity>
              )}
            </View>

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
        )}
      />
    </View>
  );
}
