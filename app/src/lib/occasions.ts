import type { OccasionType } from "./api";

export const OCCASION_LABELS: Record<OccasionType, string> = {
  cumpleanos: "Cumpleaños",
  boda: "Boda",
  baby_shower: "Baby shower",
  navidad: "Navidad",
  puntual: "Ocasión puntual",
};

export const OCCASIONS: { value: OccasionType; label: string }[] = (
  Object.entries(OCCASION_LABELS) as [OccasionType, string][]
).map(([value, label]) => ({ value, label }));
