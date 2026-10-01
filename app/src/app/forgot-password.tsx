import { Ionicons } from "@expo/vector-icons";
import { Link } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { FormInput } from "@/components/form-input";
import { PrimaryButton } from "@/components/primary-button";
import { ApiError, requestPasswordReset } from "@/lib/api";
import { colors, fonts, shared } from "@/lib/styles";

export default function ForgotPasswordScreen() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await requestPasswordReset(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo enviar el enlace");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={shared.screen} keyboardShouldPersistTaps="handled">
        <Text style={shared.title}>Recuperar contraseña</Text>
        <Text style={shared.subtitle}>
          Escribe tu email y, si tienes una cuenta, te mandamos un enlace para elegir una contraseña nueva.
        </Text>

        {sent ? (
          <View
            style={{
              alignItems: "center",
              paddingVertical: 40,
              borderRadius: 20,
              borderWidth: 1.5,
              borderColor: colors.border,
              borderStyle: "dashed",
            }}
          >
            <Ionicons name="mail-outline" size={36} color={colors.textFaint} style={{ marginBottom: 12 }} />
            <Text style={{ color: colors.textSecondary, textAlign: "center", paddingHorizontal: 20 }}>
              Si existe una cuenta con ese email, revisa tu bandeja de entrada.
            </Text>
          </View>
        ) : (
          <>
            <Text style={shared.label}>Email</Text>
            <FormInput
              icon="mail-outline"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              placeholder="tucorreo@ejemplo.com"
            />

            {error && <Text style={shared.errorText}>{error}</Text>}

            <PrimaryButton label="Enviar enlace" onPress={handleSubmit} loading={submitting} disabled={!email} />
          </>
        )}

        <View style={{ marginTop: 24, alignItems: "center" }}>
          <Link href="/login">
            <Text style={{ color: colors.primary, fontFamily: fonts.bold }}>Volver a iniciar sesión</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
