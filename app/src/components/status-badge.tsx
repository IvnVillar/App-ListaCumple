import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";
import { colors, shared } from "@/lib/styles";

type Tone = "success" | "neutral" | "accent";

const TONES: Record<Tone, { bg: string; fg: string }> = {
  success: { bg: colors.successSoft, fg: colors.success },
  neutral: { bg: colors.card, fg: colors.textSecondary },
  accent: { bg: colors.accentSoft, fg: "#9C6B0A" },
};

export function StatusBadge({
  label,
  tone = "neutral",
  icon,
}: {
  label: string;
  tone?: Tone;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  const { bg, fg } = TONES[tone];
  return (
    <View style={[shared.badge, { backgroundColor: bg }]}>
      {icon && <Ionicons name={icon} size={12} color={fg} />}
      <Text style={[shared.badgeText, { color: fg }]}>{label}</Text>
    </View>
  );
}
