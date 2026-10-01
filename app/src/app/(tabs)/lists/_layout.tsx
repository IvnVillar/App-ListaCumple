import { Stack } from "expo-router";
import { fonts } from "@/lib/styles";

export default function ListsLayout() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Atrás", headerTitleStyle: { fontFamily: fonts.semiBold } }}>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="new" options={{ title: "Nueva lista", presentation: "modal" }} />
      <Stack.Screen name="[listId]/index" options={{ headerShown: false }} />
      <Stack.Screen name="[listId]/add-item" options={{ title: "Añadir artículo", presentation: "modal" }} />
      <Stack.Screen
        name="[listId]/items/[itemId]"
        options={{ title: "Editar artículo", presentation: "modal" }}
      />
    </Stack>
  );
}
