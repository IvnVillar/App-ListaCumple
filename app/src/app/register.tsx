import { Link, router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { FormInput } from "@/components/form-input";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, shared } from "@/lib/styles";

export default function RegisterScreen() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await register(email.trim(), password);
      router.replace("/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la cuenta");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <ScrollView contentContainerStyle={shared.screen} keyboardShouldPersistTaps="handled">
        <View style={{ alignItems: "center", marginTop: 24, marginBottom: 8 }}>
          <View
            style={{
              width: 72,
              height: 72,
              borderRadius: 24,
              backgroundColor: colors.accentSoft,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 34 }}>✨</Text>
          </View>
        </View>

        <Text style={[shared.title, { textAlign: "center" }]}>Crea tu cuenta</Text>
        <Text style={[shared.subtitle, { textAlign: "center" }]}>
          Solo la necesitas para crear y gestionar tus listas.
        </Text>

        <Text style={shared.label}>Email</Text>
        <FormInput
          icon="mail-outline"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
          keyboardType="email-address"
          placeholder="tucorreo@ejemplo.com"
        />

        <Text style={shared.label}>Contraseña</Text>
        <FormInput
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Al menos 8 caracteres"
        />

        {error && <Text style={shared.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[shared.button, (submitting || !email || password.length < 8) && shared.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting || !email || password.length < 8}
        >
          <Text style={shared.buttonText}>{submitting ? "Creando..." : "Crear cuenta"}</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 24, alignItems: "center" }}>
          <Link href="/login">
            <Text style={{ color: colors.textSecondary }}>
              ¿Ya tienes cuenta? <Text style={{ color: colors.primary, fontWeight: "700" }}>Inicia sesión</Text>
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
