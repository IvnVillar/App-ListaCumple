import type { OccasionType } from "./api";

export const OCCASION_LABELS: Record<OccasionType, string> = {
  cumpleanos: "Cumpleaños",
  boda: "Boda",
  baby_shower: "Baby shower",
  navidad: "Navidad",
  puntual: "Ocasión puntual",
  guardado: "Mis guardados",
};

export const OCCASION_EMOJI: Record<OccasionType, string> = {
  cumpleanos: "🎂",
  boda: "💍",
  baby_shower: "🧸",
  navidad: "🎄",
  puntual: "🎉",
  guardado: "📌",
};

// 'guardado' no es una ocasión elegible al crear una lista a mano — es la de
// "Mis guardados", que gestiona el backend (ver api.getDefaultList).
const SELECTABLE_OCCASIONS: OccasionType[] = ["cumpleanos", "boda", "baby_shower", "navidad", "puntual"];

export const OCCASIONS: { value: OccasionType; label: string; emoji: string }[] = SELECTABLE_OCCASIONS.map(
  (value) => ({ value, label: OCCASION_LABELS[value], emoji: OCCASION_EMOJI[value] })
);
