import { View } from "react-native";
import { colors, shared } from "@/lib/styles";

export function ProgressBar({ progress, color = colors.primary }: { progress: number; color?: string }) {
  const pct = Math.max(0, Math.min(1, progress)) * 100;
  return (
    <View style={shared.progressTrack}>
      <View style={[shared.progressFill, { width: `${pct}%`, backgroundColor: color }]} />
    </View>
  );
}
