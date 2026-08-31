import type { OccasionType } from "./api";

export const OCCASION_LABELS: Record<OccasionType, string> = {
  cumpleanos: "Cumpleaños",
  boda: "Boda",
  baby_shower: "Baby shower",
  navidad: "Navidad",
  puntual: "Ocasión puntual",
};

export const OCCASION_EMOJI: Record<OccasionType, string> = {
  cumpleanos: "🎂",
  boda: "💍",
  baby_shower: "🧸",
  navidad: "🎄",
  puntual: "🎉",
};

export const OCCASIONS: { value: OccasionType; label: string; emoji: string }[] = (
  Object.entries(OCCASION_LABELS) as [OccasionType, string][]
).map(([value, label]) => ({ value, label, emoji: OCCASION_EMOJI[value] }));
