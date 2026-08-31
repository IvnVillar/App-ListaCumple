import { Link, router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { FormInput } from "@/components/form-input";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, shared } from "@/lib/styles";

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
      router.replace("/home");
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "No se pudo iniciar sesión");
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
              backgroundColor: colors.primarySoft,
              alignItems: "center",
              justifyContent: "center",
              marginBottom: 20,
            }}
          >
            <Text style={{ fontSize: 34 }}>🎁</Text>
          </View>
        </View>

        <Text style={[shared.title, { textAlign: "center" }]}>Bienvenido de vuelta</Text>
        <Text style={[shared.subtitle, { textAlign: "center" }]}>
          Inicia sesión para gestionar tus listas de deseos.
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
        <FormInput icon="lock-closed-outline" value={password} onChangeText={setPassword} secureTextEntry />

        {error && <Text style={shared.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[shared.button, (submitting || !email || !password) && shared.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting || !email || !password}
        >
          <Text style={shared.buttonText}>{submitting ? "Entrando..." : "Entrar"}</Text>
        </TouchableOpacity>

        <View style={{ marginTop: 24, alignItems: "center" }}>
          <Link href="/register">
            <Text style={{ color: colors.textSecondary }}>
              ¿No tienes cuenta? <Text style={{ color: colors.primary, fontWeight: "700" }}>Crea una</Text>
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
