import { Ionicons } from "@expo/vector-icons";
import { Link, router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, View } from "react-native";
import { FormInput } from "@/components/form-input";
import { PrimaryButton } from "@/components/primary-button";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { colors, fonts, shared } from "@/lib/styles";

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
            <Ionicons name="gift-outline" size={32} color={colors.primary} />
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

        <Link href="/forgot-password" style={{ alignSelf: "flex-end", marginTop: 8 }}>
          <Text style={{ color: colors.textSecondary, fontSize: 13 }}>¿Olvidaste tu contraseña?</Text>
        </Link>

        {error && <Text style={shared.errorText}>{error}</Text>}

        <PrimaryButton label="Entrar" onPress={handleSubmit} loading={submitting} disabled={!email || !password} />

        <View style={{ marginTop: 24, alignItems: "center" }}>
          <Link href="/register">
            <Text style={{ color: colors.textSecondary }}>
              ¿No tienes cuenta? <Text style={{ color: colors.primary, fontFamily: fonts.bold }}>Crea una</Text>
            </Text>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
