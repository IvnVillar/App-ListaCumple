import { router } from "expo-router";
import { useState } from "react";
import { ScrollView, Text, TouchableOpacity, View } from "react-native";
import { FormInput } from "@/components/form-input";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { OCCASIONS } from "@/lib/occasions";
import { shared } from "@/lib/styles";

export default function NewListScreen() {
  const { token } = useAuth();
  const [title, setTitle] = useState("");
  const [occasion, setOccasion] = useState<api.OccasionType>("cumpleanos");
  const [eventDate, setEventDate] = useState("");
  const [expiryDays, setExpiryDays] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      let expiresAt: string | null = null;
      if (occasion === "puntual" && expiryDays) {
        const base = eventDate ? new Date(`${eventDate}T00:00:00Z`) : new Date();
        base.setUTCDate(base.getUTCDate() + Number(expiryDays));
        expiresAt = base.toISOString();
      }

      const list = await api.createList(token, {
        title: title.trim(),
        occasion_type: occasion,
        event_date: eventDate || null,
        expires_at: expiresAt,
      });
      router.replace(`/lists/${list.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la lista");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={shared.screen}>
      <Text style={[shared.subtitle, { marginTop: 4 }]}>Dale un nombre y elige para qué ocasión es.</Text>

      <Text style={shared.label}>Título</Text>
      <FormInput icon="pricetag-outline" value={title} onChangeText={setTitle} placeholder="Cumple de Marta" />

      <Text style={shared.label}>Ocasión</Text>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8 }}>
        {OCCASIONS.map((o) => (
          <TouchableOpacity
            key={o.value}
            onPress={() => setOccasion(o.value)}
            style={[shared.chip, occasion === o.value && shared.chipActive]}
            activeOpacity={0.7}
          >
            <Text>{o.emoji}</Text>
            <Text style={[shared.chipText, occasion === o.value && shared.chipTextActive]}>{o.label}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <Text style={shared.label}>Fecha del evento (opcional, AAAA-MM-DD)</Text>
      <FormInput icon="calendar-outline" value={eventDate} onChangeText={setEventDate} placeholder="2026-12-24" />

      {occasion === "puntual" && (
        <>
          <Text style={shared.label}>El enlace caduca a los N días del evento (opcional)</Text>
          <FormInput
            icon="time-outline"
            value={expiryDays}
            onChangeText={setExpiryDays}
            keyboardType="number-pad"
            placeholder="7"
          />
        </>
      )}

      {error && <Text style={shared.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[shared.button, (submitting || !title.trim()) && shared.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting || !title.trim()}
      >
        <Text style={shared.buttonText}>{submitting ? "Creando..." : "Crear lista"}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}
