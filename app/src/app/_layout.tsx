import { Stack, useRouter } from "expo-router";
import { AuthProvider } from "@/lib/auth";
import { ShareIntentProvider } from "@/lib/shareIntent";

export default function RootLayout() {
  const router = useRouter();

  return (
    <ShareIntentProvider
      options={{
        resetOnBackground: true,
        onResetShareIntent: () => router.replace("/"),
      }}
    >
      <AuthProvider>
        <Stack screenOptions={{ headerBackTitle: "Atrás" }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: "Iniciar sesión" }} />
          <Stack.Screen name="register" options={{ title: "Crear cuenta" }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="l/[shareToken]/index" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </ShareIntentProvider>
  );
}
