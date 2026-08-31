import { router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { FormInput } from "@/components/form-input";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, shared } from "@/lib/styles";

type Mode = "url" | "manual";

export default function AddItemScreen() {
  const { listId } = useLocalSearchParams<{ listId: string }>();
  const { token } = useAuth();

  const [mode, setMode] = useState<Mode>("url");
  const [sourceUrl, setSourceUrl] = useState("");
  const [extracting, setExtracting] = useState(false);
  const [extractionWarnings, setExtractionWarnings] = useState<string[]>([]);
  const [hasExtracted, setHasExtracted] = useState(false);

  const [title, setTitle] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [price, setPrice] = useState("");
  const [currency, setCurrency] = useState("");
  const [storeName, setStoreName] = useState("");
  const [notes, setNotes] = useState("");
  const [manualLink, setManualLink] = useState("");
  const [isGroupGift, setIsGroupGift] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleExtract() {
    if (!sourceUrl.trim()) return;
    setError(null);
    setExtracting(true);
    try {
      const result = await api.extractMetadata(sourceUrl.trim());
      if (result.title) setTitle(result.title);
      if (result.image_url) setImageUrl(result.image_url);
      if (result.price != null) setPrice(String(result.price));
      if (result.currency) setCurrency(result.currency);
      if (result.store_name) setStoreName(result.store_name);
      setExtractionWarnings(result.warnings);
      setHasExtracted(true);
    } catch (err) {
      setExtractionWarnings([]);
      setError(
        err instanceof ApiError
          ? `${err.message} Puedes completar los datos manualmente.`
          : "No se pudo extraer la información. Completa los datos manualmente."
      );
      setHasExtracted(true);
    } finally {
      setExtracting(false);
    }
  }

  async function handleSubmit() {
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      await api.addItem(token, listId, {
        title: title.trim() || undefined,
        image_url: imageUrl.trim() || null,
        price: price ? Number(price) : null,
        currency: currency.trim() || null,
        source_url: (mode === "url" ? sourceUrl.trim() : manualLink.trim()) || null,
        store_name: storeName.trim() || null,
        notes: notes.trim() || null,
        is_group_gift: isGroupGift,
      });
      router.back();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo añadir el artículo");
    } finally {
      setSubmitting(false);
    }
  }

  // En modo URL, editar el link tras extraer resetea hasExtracted (oculta
  // los campos) pero no borra title/price/etc. — exigir hasExtracted aquí
  // evita enviar con esos valores obsoletos e invisibles bajo un link distinto.
  const canSubmit = mode === "manual" ? title.trim().length > 0 : hasExtracted && title.trim().length > 0;

  return (
    <ScrollView style={shared.screen}>
      <View style={{ flexDirection: "row", gap: 8, marginBottom: 8 }}>
        <TouchableOpacity
          onPress={() => setMode("url")}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            alignItems: "center",
            backgroundColor: mode === "url" ? colors.primary : colors.card,
          }}
        >
          <Text style={{ color: mode === "url" ? colors.primaryText : colors.text, fontWeight: "600" }}>
            Pegar enlace
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            // Si ya se extrajo desde una URL y se cambia a Manual, el link
            // no debe perderse en silencio: se traslada al campo manual.
            if (sourceUrl.trim() && !manualLink.trim()) setManualLink(sourceUrl.trim());
            setMode("manual");
          }}
          style={{
            flex: 1,
            paddingVertical: 10,
            borderRadius: 10,
            alignItems: "center",
            backgroundColor: mode === "manual" ? colors.primary : colors.card,
          }}
        >
          <Text style={{ color: mode === "manual" ? colors.primaryText : colors.text, fontWeight: "600" }}>
            Manual
          </Text>
        </TouchableOpacity>
      </View>

      {mode === "url" && (
        <>
          <Text style={shared.label}>URL del producto</Text>
          <FormInput
            value={sourceUrl}
            onChangeText={(text) => {
              setSourceUrl(text);
              setHasExtracted(false);
            }}
            autoCapitalize="none"
            keyboardType="url"
            placeholder="https://..."
          />
          <TouchableOpacity
            style={[shared.secondaryButton, (!sourceUrl.trim() || extracting) && shared.buttonDisabled]}
            onPress={handleExtract}
            disabled={!sourceUrl.trim() || extracting}
          >
            {extracting ? (
              <ActivityIndicator />
            ) : (
              <Text style={shared.secondaryButtonText}>Extraer información</Text>
            )}
          </TouchableOpacity>
          {extractionWarnings.length > 0 && (
            <Text style={{ color: colors.textSecondary, fontSize: 13, marginTop: 8 }}>
              {extractionWarnings.join(" ")}
            </Text>
          )}
        </>
      )}

      {(mode === "manual" || hasExtracted) && (
        <>
          <Text style={shared.label}>Título</Text>
          <FormInput value={title} onChangeText={setTitle} placeholder="Nombre del artículo" />

          <Text style={shared.label}>Precio</Text>
          <FormInput value={price} onChangeText={setPrice} keyboardType="decimal-pad" placeholder="29.99" />

          {mode === "manual" && (
            <>
              <Text style={shared.label}>Link (opcional)</Text>
              <FormInput
                value={manualLink}
                onChangeText={setManualLink}
                autoCapitalize="none"
                keyboardType="url"
                placeholder="https://..."
              />
            </>
          )}

          <Text style={shared.label}>Moneda</Text>
          <FormInput value={currency} onChangeText={setCurrency} placeholder="EUR" autoCapitalize="characters" maxLength={3} />

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
        </>
      )}

      {error && <Text style={shared.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[shared.button, (!canSubmit || submitting) && shared.buttonDisabled]}
        onPress={handleSubmit}
        disabled={!canSubmit || submitting}
      >
        <Text style={shared.buttonText}>{submitting ? "Añadiendo..." : "Añadir artículo"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
