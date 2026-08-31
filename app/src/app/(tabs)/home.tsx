import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { FormInput } from "@/components/form-input";
import { useAuth } from "@/lib/auth";
import { colors, radius, shared, spacing } from "@/lib/styles";

export default function HomeScreen() {
  const { email } = useAuth();
  const [url, setUrl] = useState("");

  function handleAdd() {
    const trimmed = url.trim();
    if (!trimmed) return;
    router.push({ pathname: "/lists/share-target", params: { url: trimmed } });
    setUrl("");
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={shared.screen} keyboardShouldPersistTaps="handled">
        <Text style={shared.eyebrow}>Hola{email ? ` de nuevo` : ""}</Text>
        <Text style={shared.title}>¿Qué le regalamos?</Text>
        <Text style={shared.subtitle}>Pega el enlace de un producto y elige a qué lista añadirlo.</Text>

        <FormInput
          icon="link-outline"
          value={url}
          onChangeText={setUrl}
          autoCapitalize="none"
          keyboardType="url"
          placeholder="Pega aquí el enlace de un producto"
          onSubmitEditing={handleAdd}
        />
        <TouchableOpacity
          style={[shared.button, !url.trim() && shared.buttonDisabled]}
          onPress={handleAdd}
          disabled={!url.trim()}
        >
          <Text style={shared.buttonText}>Añadir a una lista</Text>
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
