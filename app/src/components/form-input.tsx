import { TextInput, type TextInputProps } from "react-native";
import { colors, shared } from "@/lib/styles";

export function FormInput(props: TextInputProps) {
  return <TextInput placeholderTextColor={colors.textSecondary} style={shared.input} {...props} />;
}
