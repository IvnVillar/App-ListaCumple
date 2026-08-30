import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from "expo-secure-store";
import { Platform } from "react-native";

// SecureStore usa Keychain/Keystore en iOS/Android, mucho mejor sitio para un
// token de sesión que AsyncStorage (texto plano). No existe en web, así que
// ahí se mantiene AsyncStorage como único almacenamiento disponible.
const isWeb = Platform.OS === "web";

export const secureStorage = {
  getItem: (key: string): Promise<string | null> =>
    isWeb ? AsyncStorage.getItem(key) : SecureStore.getItemAsync(key),
  setItem: (key: string, value: string): Promise<void> =>
    isWeb ? AsyncStorage.setItem(key, value) : SecureStore.setItemAsync(key, value),
  removeItem: (key: string): Promise<void> =>
    isWeb ? AsyncStorage.removeItem(key) : SecureStore.deleteItemAsync(key),
};
