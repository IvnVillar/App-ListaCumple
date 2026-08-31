import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { FormInput } from "@/components/form-input";
import * as api from "@/lib/api";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, radius, shared, spacing } from "@/lib/styles";

export default function HomeScreen() {
  const { email, token } = useAuth();
  const [url, setUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAdd() {
    const trimmed = url.trim();
    if (!trimmed || !token) return;
    setError(null);
    setSaving(true);
    try {
      const defaultList = await api.getDefaultList(token);
      setUrl("");
      router.push({ pathname: "/lists/[listId]/add-item", params: { listId: defaultList.id, url: trimmed } });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo guardar el enlace");
    } finally {
      setSaving(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={shared.screen} keyboardShouldPersistTaps="handled">
        <Text style={shared.eyebrow}>Hola{email ? ` de nuevo` : ""}</Text>
        <Text style={shared.title}>¿Qué le regalamos?</Text>
        <Text style={shared.subtitle}>Pega el enlace de un producto y se guarda directamente en Mis guardados.</Text>

        <FormInput
          icon="link-outline"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="Pega aquí el enlace de un producto"
          onSubmitEditing={handleAdd}
        />
        {error && <Text style={shared.errorText}>{error}</Text>}
        <TouchableOpacity
          style={[shared.button, (!url.trim() || saving) && shared.buttonDisabled]}
          onPress={handleAdd}
          disabled={!url.trim() || saving}
        >
          {saving ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={shared.buttonText}>📌 Guardar</Text>
          )}
        </TouchableOpacity>

        <View
          style={{
            marginTop: spacing.xxl,
            alignItems: "center",
            paddingVertical: spacing.xxl,
            borderRadius: radius.lg,
            borderWidth: 1.5,
            borderColor: colors.border,
            borderStyle: "dashed",
          }}
        >
          <Ionicons name="sparkles-outline" size={24} color={colors.textFaint} />
          <Text style={{ color: colors.textSecondary, marginTop: spacing.sm, textAlign: "center" }}>
            Próximamente: aquí verás lo que tus amigos han añadido y reservado.
          </Text>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
