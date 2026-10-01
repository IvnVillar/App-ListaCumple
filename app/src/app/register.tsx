import { Ionicons } from "@expo/vector-icons";
import * as WebBrowser from "expo-web-browser";
import { Link, router } from "expo-router";
import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, Text, TouchableOpacity, View } from "react-native";
import { FormInput } from "@/components/form-input";
import { ApiError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { API_BASE_URL } from "@/lib/config";
import { colors, shared, spacing } from "@/lib/styles";

function ConsentCheckbox({
  checked,
  onToggle,
  children,
}: {
  checked: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <TouchableOpacity
      onPress={onToggle}
      style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing.sm, marginTop: spacing.md }}
      accessibilityRole="checkbox"
      accessibilityState={{ checked }}
    >
      <Ionicons
        name={checked ? "checkbox" : "square-outline"}
        size={20}
        color={checked ? colors.primary : colors.textFaint}
      />
      <Text style={{ flex: 1, color: colors.textSecondary, fontSize: 13, lineHeight: 18 }}>{children}</Text>
    </TouchableOpacity>
  );
}

// Enlaces aparte del propio TouchableOpacity que marca la casilla: un <Text
// onPress> anidado dentro de otro Touchable no es fiable en nativo (el padre
// se queda con el toque y el enlace nunca llega a abrirse), así que viven
// como sus propios botones, fuera de esa área.
function LegalLinks() {
  return (
    <View style={{ flexDirection: "row", gap: spacing.lg, marginTop: spacing.md }}>
      <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(`${API_BASE_URL}/terms`)} hitSlop={8}>
        <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Ver Términos de servicio</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={() => WebBrowser.openBrowserAsync(`${API_BASE_URL}/privacy`)} hitSlop={8}>
        <Text style={{ color: colors.primary, fontWeight: "700", fontSize: 13 }}>Ver Política de privacidad</Text>
      </TouchableOpacity>
    </View>
  );
}

export default function RegisterScreen() {
  const { register } = useAuth();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [confirmedAge, setConfirmedAge] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const usernameValid = /^[a-zA-Z0-9_]{3,20}$/.test(username.trim());
  const canSubmit = !!email && usernameValid && password.length >= 8 && acceptedTerms && confirmedAge;

  async function handleSubmit() {
    setError(null);
    setSubmitting(true);
    try {
      await register(email.trim(), username.trim(), password, acceptedTerms, confirmedAge);
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

        <Text style={shared.label}>Nombre de usuario</Text>
        <FormInput
          icon="at-outline"
          value={username}
          onChangeText={setUsername}
          autoCapitalize="none"
          placeholder="Para que tus amigos te encuentren"
        />

        <Text style={shared.label}>Contraseña</Text>
        <FormInput
          icon="lock-closed-outline"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          placeholder="Al menos 8 caracteres"
        />

        <LegalLinks />

        <ConsentCheckbox checked={acceptedTerms} onToggle={() => setAcceptedTerms((v) => !v)}>
          Acepto los Términos de servicio y la Política de privacidad
        </ConsentCheckbox>

        <ConsentCheckbox checked={confirmedAge} onToggle={() => setConfirmedAge((v) => !v)}>
          Confirmo que tengo 16 años o más
        </ConsentCheckbox>

        {error && <Text style={shared.errorText}>{error}</Text>}

        <TouchableOpacity
          style={[shared.button, (submitting || !canSubmit) && shared.buttonDisabled]}
          onPress={handleSubmit}
          disabled={submitting || !canSubmit}
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
