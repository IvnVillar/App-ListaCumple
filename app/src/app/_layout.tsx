import { Stack } from "expo-router";
import { AuthProvider } from "@/lib/auth";

export default function RootLayout() {
  return (
    <AuthProvider>
      <Stack screenOptions={{ headerBackTitle: "Atrás" }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="login" options={{ title: "Iniciar sesión" }} />
        <Stack.Screen name="register" options={{ title: "Crear cuenta" }} />
        <Stack.Screen name="lists" options={{ headerShown: false }} />
        <Stack.Screen name="l/[shareToken]/index" options={{ title: "Lista de deseos" }} />
      </Stack>
    </AuthProvider>
  );
}
