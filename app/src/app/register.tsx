import { Link, router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from "react-native";
import { FormInput } from "@/components/form-input";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { shared } from "@/lib/styles";

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
      router.replace("/lists");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo crear la cuenta");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={shared.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={shared.title}>Crea tu cuenta</Text>
      <Text style={shared.subtitle}>Solo la necesitas para crear y gestionar listas.</Text>

      <Text style={shared.label}>Email</Text>
      <FormInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="tucorreo@ejemplo.com"
      />

      <Text style={shared.label}>Contraseña</Text>
      <FormInput
        value={password}
        onChangeText={setPassword}
        secureTextEntry
        placeholder="Al menos 8 caracteres"
      />

      {error && <Text style={shared.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[shared.button, submitting && shared.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting || !email || password.length < 8}
      >
        <Text style={shared.buttonText}>{submitting ? "Creando..." : "Crear cuenta"}</Text>
      </TouchableOpacity>

      <View style={{ marginTop: 24, alignItems: "center" }}>
        <Link href="/login">
          <Text>¿Ya tienes cuenta? Inicia sesión</Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
