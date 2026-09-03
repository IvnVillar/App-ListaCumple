import { Ionicons } from "@expo/vector-icons";
import { router, useLocalSearchParams } from "expo-router";
import { useEffect, useState } from "react";
import { ActivityIndicator, ScrollView, Switch, Text, TouchableOpacity, View } from "react-native";
import { FormInput } from "@/components/form-input";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, shared, spacing } from "@/lib/styles";

type Mode = "url" | "manual";

export default function AddItemScreen() {
  const { listId, url: sharedUrlParam } = useLocalSearchParams<{ listId: string; url?: string }>();
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

  // Llegada desde el share sheet nativo (spec 2.c): la URL ya viene elegida,
  // así que se rellena y se extrae sola en vez de obligar a pegarla a mano.
  useEffect(() => {
    if (sharedUrlParam) {
      setSourceUrl(sharedUrlParam);
      handleExtract(sharedUrlParam);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sharedUrlParam]);

  // Extrae sola tras una pausa al escribir/pegar, en vez de obligar a tocar
  // el botón. El requisito de un punto evita disparar con cada tecla de un
  // link a medio pegar; el botón sigue ahí como reintento manual.
  useEffect(() => {
    if (mode !== "url" || hasExtracted || extracting) return;
    const url = sourceUrl.trim();
    if (!/\S+\.\S+/.test(url)) return;
    const timer = setTimeout(() => handleExtract(), 700);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sourceUrl, mode]);

  async function handleExtract(urlOverride?: string) {
    const url = (urlOverride ?? sourceUrl).trim();
    if (!url || !token) return;
    setError(null);
    setExtracting(true);
    try {
      const result = await api.extractMetadata(token, url);
      if (result.title) setTitle(result.title);
      if (result.image_url) setImageUrl(result.image_url);
      if (result.price != null) setPrice(String(result.price));
      if (result.currency) setCurrency(result.currency);
      if (result.store_name) setStoreName(result.store_name);
      setExtractionWarnings(result.warnings);
      setHasExtracted(true);
    } catch (err) {
      setExtractionWarnings([]);
      if (err instanceof ApiError) {
        setError(/manual/i.test(err.message) ? err.message : `${err.message} Puedes completar los datos manualmente.`);
      } else {
        setError("No se pudo extraer la información. Completa los datos manualmente.");
      }
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
    <ScrollView contentContainerStyle={shared.screen}>
      <View style={{ flexDirection: "row", gap: spacing.sm, marginBottom: spacing.sm }}>
        <TouchableOpacity
          onPress={() => setMode("url")}
          style={[
            shared.chip,
            { flex: 1, justifyContent: "center" },
            mode === "url" && shared.chipActive,
          ]}
        >
          <Ionicons name="link-outline" size={15} color={mode === "url" ? colors.primaryDark : colors.text} />
          <Text style={[shared.chipText, mode === "url" && shared.chipTextActive]}>Pegar enlace</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => {
            // Si ya se extrajo desde una URL y se cambia a Manual, el link
            // no debe perderse en silencio: se traslada al campo manual.
            if (sourceUrl.trim() && !manualLink.trim()) setManualLink(sourceUrl.trim());
            setMode("manual");
          }}
          style={[
            shared.chip,
            { flex: 1, justifyContent: "center" },
            mode === "manual" && shared.chipActive,
          ]}
        >
          <Ionicons name="create-outline" size={15} color={mode === "manual" ? colors.primaryDark : colors.text} />
          <Text style={[shared.chipText, mode === "manual" && shared.chipTextActive]}>Manual</Text>
        </TouchableOpacity>
      </View>

      {mode === "url" && (
        <>
          <Text style={shared.label}>URL del producto</Text>
          <FormInput
            icon="link-outline"
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
            onPress={() => handleExtract()}
            disabled={!sourceUrl.trim() || extracting}
          >
            {extracting ? (
              <ActivityIndicator color={colors.primary} />
            ) : (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Ionicons name="sparkles-outline" size={16} color={colors.text} />
                <Text style={shared.secondaryButtonText}>Extraer información</Text>
              </View>
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
          <FormInput icon="pricetag-outline" value={title} onChangeText={setTitle} placeholder="Nombre del artículo" />

          <Text style={shared.label}>Precio</Text>
          <FormInput
            icon="cash-outline"
            value={price}
            onChangeText={setPrice}
            keyboardType="decimal-pad"
            placeholder="29.99"
          />

          {mode === "manual" && (
            <>
              <Text style={shared.label}>Link (opcional)</Text>
              <FormInput
                icon="link-outline"
                value={manualLink}
                onChangeText={setManualLink}
                autoCapitalize="none"
                keyboardType="url"
                placeholder="https://..."
              />
            </>
          )}

          <Text style={shared.label}>Moneda</Text>
          <FormInput
            value={currency}
            onChangeText={setCurrency}
            placeholder="EUR"
            autoCapitalize="characters"
            maxLength={3}
          />

          <Text style={shared.label}>Imagen (URL)</Text>
          <FormInput icon="image-outline" value={imageUrl} onChangeText={setImageUrl} autoCapitalize="none" placeholder="https://..." />

          <Text style={shared.label}>Tienda</Text>
          <FormInput icon="storefront-outline" value={storeName} onChangeText={setStoreName} placeholder="Amazon" />

          <Text style={shared.label}>Nota</Text>
          <FormInput icon="chatbox-ellipses-outline" value={notes} onChangeText={setNotes} placeholder="Talla M, color azul..." />

          <View
            style={[
              shared.card,
              { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xl },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, flex: 1 }}>
              <Text style={{ fontSize: 18 }}>💰</Text>
              <Text style={{ color: colors.text, fontSize: 15, fontWeight: "600", flex: 1 }}>
                Bote común{"\n"}
                <Text style={{ fontSize: 12, fontWeight: "400", color: colors.textSecondary }}>
                  varias personas aportan
                </Text>
              </Text>
            </View>
            <Switch
              value={isGroupGift}
              onValueChange={setIsGroupGift}
              trackColor={{ true: colors.primary, false: colors.border }}
            />
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
