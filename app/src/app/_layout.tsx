import {
  PlusJakartaSans_400Regular,
  PlusJakartaSans_500Medium,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/plus-jakarta-sans";
import Constants from "expo-constants";
import { Stack, useRouter } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import { useEffect } from "react";
import { AuthProvider } from "@/lib/auth";
import { ShareIntentProvider } from "@/lib/shareIntent";
import { fonts } from "@/lib/styles";

// expo-share-intent usa código nativo que Expo Go no tiene: sin esto, la app
// crashearía nada más abrirla en Expo Go (única forma de probarla en iPhone
// sin pagar Apple Developer Program). El resto de la app funciona igual;
// solo se pierde compartir desde otra app (Instagram/TikTok) directamente.
const isExpoGo = Constants.appOwnership === "expo";

SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const router = useRouter();
  const [fontsLoaded] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_500Medium,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
  });

  useEffect(() => {
    if (fontsLoaded) SplashScreen.hideAsync();
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ShareIntentProvider
      options={{
        disabled: isExpoGo,
        resetOnBackground: true,
        onResetShareIntent: () => router.replace("/"),
      }}
    >
      <AuthProvider>
        <Stack screenOptions={{ headerBackTitle: "Atrás", headerTitleStyle: { fontFamily: fonts.semiBold } }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="login" options={{ title: "Iniciar sesión" }} />
          <Stack.Screen name="register" options={{ title: "Crear cuenta" }} />
          <Stack.Screen name="forgot-password" options={{ title: "Recuperar contraseña" }} />
          <Stack.Screen name="reset-password" options={{ title: "Nueva contraseña" }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="l/[shareToken]/index" options={{ headerShown: false }} />
        </Stack>
      </AuthProvider>
    </ShareIntentProvider>
  );
}
