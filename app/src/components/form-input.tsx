import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, TextInput, View, type TextInputProps } from "react-native";
import { colors, radius } from "@/lib/styles";

interface FormInputProps extends TextInputProps {
  icon?: keyof typeof Ionicons.glyphMap;
}

export function FormInput({ icon, style, ...props }: FormInputProps) {
  if (!icon) {
    return <TextInput placeholderTextColor={colors.textSecondary} style={[localStyles.input, style]} {...props} />;
  }

  return (
    <View style={localStyles.wrapper}>
      <Ionicons name={icon} size={18} color={colors.textFaint} style={localStyles.icon} />
      <TextInput
        placeholderTextColor={colors.textSecondary}
        style={[localStyles.input, localStyles.inputWithIcon, style]}
        {...props}
      />
    </View>
  );
}

const localStyles = StyleSheet.create({
  wrapper: {
    position: "relative",
    justifyContent: "center",
  },
  icon: {
    position: "absolute",
    left: 16,
    zIndex: 1,
  },
  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: colors.text,
    backgroundColor: colors.surface,
  },
  inputWithIcon: {
    paddingLeft: 46,
  },
});
