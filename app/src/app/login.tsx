import { Link, router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, Text, TouchableOpacity, View } from "react-native";
import { FormInput } from "@/components/form-input";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { shared } from "@/lib/styles";

export default function LoginScreen() {
  const { login } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await login(email.trim(), password);
      router.replace("/lists");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <KeyboardAvoidingView style={shared.screen} behavior={Platform.OS === "ios" ? "padding" : undefined}>
      <Text style={shared.title}>Inicia sesión</Text>
      <Text style={shared.subtitle}>Accede para gestionar tus listas de deseos.</Text>

      <Text style={shared.label}>Email</Text>
      <FormInput
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
        placeholder="tucorreo@ejemplo.com"
      />

      <Text style={shared.label}>Contraseña</Text>
      <FormInput value={password} onChangeText={setPassword} secureTextEntry />

      {error && <Text style={shared.errorText}>{error}</Text>}

      <TouchableOpacity
        style={[shared.button, submitting && shared.buttonDisabled]}
        onPress={handleSubmit}
        disabled={submitting || !email || !password}
      >
        <Text style={shared.buttonText}>{submitting ? "Entrando..." : "Entrar"}</Text>
      </TouchableOpacity>

      <View style={{ marginTop: 24, alignItems: "center" }}>
        <Link href="/register">
          <Text>¿No tienes cuenta? Crea una</Text>
        </Link>
      </View>
    </KeyboardAvoidingView>
  );
}
