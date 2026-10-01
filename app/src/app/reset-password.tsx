import { Link, router, useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { FormInput } from "@/components/form-input";
import { ApiError, resetPassword } from "@/lib/api";
import { colors, shared } from "@/lib/styles";

export default function ResetPasswordScreen() {
  const { token } = useLocalSearchParams<{ token?: string }>();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit() {
    if (!token) return;
    setError(null);
    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo cambiar la contraseña");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={shared.screen} keyboardShouldPersistTaps="handled">
        <Text style={shared.title}>Elige una contraseña nueva</Text>

        {!token ? (
          <Text style={shared.errorText}>
            Este enlace no es válido. Pide uno nuevo desde "¿Olvidaste tu contraseña?" en la pantalla de inicio de
            sesión.
          </Text>
        ) : done ? (
          <>
            <Text style={shared.subtitle}>Tu contraseña se ha actualizado. Ya puedes iniciar sesión con ella.</Text>
            <TouchableOpacity style={shared.button} onPress={() => router.replace("/login")}>
              <Text style={shared.buttonText}>Iniciar sesión</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <Text style={shared.subtitle}>Este enlace caduca a la hora de haberlo pedido.</Text>

            <Text style={shared.label}>Contraseña nueva</Text>
            <FormInput
              icon="lock-closed-outline"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              placeholder="Al menos 8 caracteres"
            />

            {error && <Text style={shared.errorText}>{error}</Text>}

            <TouchableOpacity
              style={[shared.button, (submitting || password.length < 8) && shared.buttonDisabled]}
              onPress={handleSubmit}
              disabled={submitting || password.length < 8}
            >
              <Text style={shared.buttonText}>{submitting ? "Guardando..." : "Guardar contraseña"}</Text>
            </TouchableOpacity>
          </>
        )}

        <View style={{ marginTop: 24, alignItems: "center" }}>
          <Link href="/login">
            <Text style={{ color: colors.primary, fontWeight: "700" }}>Volver a iniciar sesión</Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
