import Constants from "expo-constants";
import { Stack, useRouter } from "expo-router";
import { AuthProvider } from "@/lib/auth";
import { ShareIntentProvider } from "@/lib/shareIntent";

// expo-share-intent usa código nativo que Expo Go no tiene: sin esto, la app
// crashearía nada más abrirla en Expo Go (única forma de probarla en iPhone
// sin pagar Apple Developer Program). El resto de la app funciona igual;
// solo se pierde compartir desde otra app (Instagram/TikTok) directamente.
const isExpoGo = Constants.appOwnership === "expo";

export default function RootLayout() {
  const router = useRouter();

  return (
    <ShareIntentProvider
      options={{
        disabled: isExpoGo,
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
