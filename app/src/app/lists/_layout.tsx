import { Redirect, Stack } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "@/lib/auth";

export default function ListsLayout() {
  const { token, isLoading } = useAuth();

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
        <ActivityIndicator />
      </View>
    );
  }

  if (!token) {
    return <Redirect href="/login" />;
  }

  return (
    <Stack screenOptions={{ headerBackTitle: "Atrás" }}>
      <Stack.Screen name="index" options={{ title: "Mis listas" }} />
      <Stack.Screen name="new" options={{ title: "Nueva lista", presentation: "modal" }} />
      <Stack.Screen name="[listId]/index" options={{ title: "Lista" }} />
      <Stack.Screen name="[listId]/add-item" options={{ title: "Añadir artículo", presentation: "modal" }} />
    </Stack>
  );
}
