import { Stack } from "expo-router";
import { fonts } from "@/lib/styles";

export default function FriendsLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Atrás", headerTitleStyle: { fontFamily: fonts.semiBold } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[friendId]/index" options={{ title: "Sus listas" }} />
    </Stack>
  );
}
