import { useState } from "react";
import { ActivityIndicator, Animated, Text, TouchableOpacity, type StyleProp, type ViewStyle } from "react-native";
import { colors, shared } from "@/lib/styles";

interface PrimaryButtonProps {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  style?: StyleProp<ViewStyle>;
}

// Botón primario único para toda la app: antes cada pantalla repetía a mano
// el [shared.button, condición && shared.buttonDisabled] + spinner-o-texto,
// con pequeñas inconsistencias entre pantallas. De paso añade la respuesta
// táctil al pulsar (un ligero scale-down con spring) que faltaba — antes
// solo había el fade de opacidad por defecto de TouchableOpacity.
export function PrimaryButton({ label, onPress, disabled, loading, style }: PrimaryButtonProps) {
  // useState en vez de useRef: con el React Compiler activado en este
  // proyecto, leer ref.current durante el render (incluso solo para
  // inicializarlo así, en la misma línea) salta como error de lint.
  const [scale] = useState(() => new Animated.Value(1));
  const isDisabled = disabled || loading;

  function pressIn() {
    if (isDisabled) return;
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }
  function pressOut() {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 50, bounciness: 4 }).start();
  }

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <TouchableOpacity
        style={[shared.button, isDisabled && shared.buttonDisabled, style]}
        onPress={onPress}
        onPressIn={pressIn}
        onPressOut={pressOut}
        disabled={isDisabled}
        activeOpacity={0.88}
      >
        {loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={shared.buttonText}>{label}</Text>}
      </TouchableOpacity>
    </Animated.View>
  );
}
