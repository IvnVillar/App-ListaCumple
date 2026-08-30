import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useState } from "react";
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { FormInput } from "@/components/form-input";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, shared } from "@/lib/styles";

export default function EditItemScreen() {
  const { listId, itemId } = useLocalSearchParams<{ listId: string; itemId: string }>();
  const { token } = useAuth();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("");
  const [storeName, setStoreName] = useState("");
  const [notes, setNotes] = useState("");
  const [isGroupGift, setIsGroupGift] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setLoadError(null);
    try {
      const list = await api.getList(token, listId);
      const item = list.items.find((i) => i.id === itemId);
      if (!item) {
        setLoadError("Artículo no encontrado");
        return;
      }
      setTitle(item.title);
      setImageUrl(item.image_url ?? "");
      setPrice(item.price ?? "");
      setCurrency(item.currency ?? "");
      setStoreName(item.store_name ?? "");
      setNotes(item.notes ?? "");
      setIsGroupGift(item.is_group_gift);
    } catch (err) {
      setLoadError(err instanceof ApiError ? err.message : "No se pudo cargar el artículo");
    } finally {
      setLoading(false);
    }
  }, [token, listId, itemId]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  async function handleSubmit() {
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.updateItem(token, listId, itemId, {
        title: title.trim(),
        image_url: imageUrl.trim() || null,
        price: price ? Number(price) : null,
        currency: currency.trim() || null,
        store_name: storeName.trim() || null,
        notes: notes.trim() || null,
        is_group_gift: isGroupGift,
      });
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el artículo");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <View style={shared.center}>
        <ActivityIndicator />
      </View>
    );
  }

  if (loadError) {
    return (
      <View style={shared.center}>
        <Text style={{ color: colors.textSecondary }}>{loadError}</Text>
      </View>
    );
  }

  return (
    <ScrollView style={shared.screen}>
      <Text style={shared.label}>Título</Text>
      <FormInput value={title} onChangeText={setTitle} placeholder="Nombre del artículo" />

      <Text style={shared.label}>Precio</Text>
      <FormInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="29.99" />

      <Text style={shared.label}>Moneda</Text>
      <FormInput
        value={currency}
        onChangeText={setCurrency}
        placeholder="EUR"
        autoCapitalize="characters"
        maxLength={3}
      />

      <Text style={shared.label}>Imagen (URL)</Text>
      <FormInput value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" placeholder="https://..." />

      <Text style={shared.label}>Tienda</Text>
      <FormInput value={storeName} onChangeText={setStoreName} placeholder="Amazon" />

      <Text style={shared.label}>Nota</Text>
      <FormInput value={notes} onChangeText={setNotes} placeholder="Talla M, color azul..." />

      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 20 }}>
        <Text style={{ color: colors.text, fontSize: 15 }}>Bote común (regalo colectivo)</Text>
        <Switch value={isGroupGift} onValueChange={setIsGroupGift} />
      </View>

      {error && <Text style={shared.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[shared.button, (!title.trim() || submitting) && shared.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!title.trim() || submitting}
      >
        <Text style={shared.buttonText}>{submitting ? "Guardando..." : "Guardar cambios"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
