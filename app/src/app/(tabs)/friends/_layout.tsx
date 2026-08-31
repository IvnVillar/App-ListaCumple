import { Stack } from "expo-router";

export default function FriendsLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Atrás" }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="[friendId]/index" options={{ title: "Sus listas" }} />
    </Stack>
  );
}
