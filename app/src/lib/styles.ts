import { StyleSheet } from "react-native";

// Plus Jakarta Sans en vez de la fuente del sistema: cada peso es un archivo
// de fuente distinto (no una variante sintética de uno solo), así que en
// cualquier texto que use uno de estos pesos hay que poner fontFamily, no
// fontWeight — fontWeight no tiene efecto sobre una fuente estática como
// esta. Cargada en _layout.tsx con expo-font antes de pintar nada.
export const fonts = {
  regular: "PlusJakartaSans_400Regular",
  medium: "PlusJakartaSans_500Medium",
  semiBold: "PlusJakartaSans_600SemiBold",
  bold: "PlusJakartaSans_700Bold",
  extraBold: "PlusJakartaSans_800ExtraBold",
};

// Los tonos de texto/acento están ajustados para cumplir el contraste
// mínimo AA de WCAG (4.5:1) contra los fondos donde se usan como texto;
// ver el cálculo en la auditoría de accesibilidad.
export const colors = {
  background: "#FFF9F6",
  surface: "#FFFFFF",
  text: "#241B2F",
  textSecondary: "#797080",
  textFaint: "#968D97",
  border: "#F0E4E8",
  borderStrong: "#E4D5DA",

  primary: "#CC3E6B",
  primaryDark: "#C23260",
  primarySoft: "#FDE7EF",
  primaryText: "#FFFFFF",

  accent: "#F5A524",
  accentSoft: "#FFF3DC",

  success: "#16A34A",
  successSoft: "#E7F9EE",

  danger: "#D32424",
  dangerSoft: "#FDECEC",

  card: "#FFF3EF",
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 28,
  xxxl: 36,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 20,
  pill: 999,
};

// Sombra difuminada y tenue (en vez de una sombra genérica negra y marcada):
// más radio, menos opacidad, para que las cards floten en vez de recortarse.
export const shadow = {
  shadowColor: "#3A1F2E",
  shadowOpacity: 0.06,
  shadowRadius: 20,
  shadowOffset: { width: 0, height: 8 },
  elevation: 2,
};

export const shared = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.background,
    padding: spacing.xl,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.background,
  },

  eyebrow: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
    color: colors.primary,
    letterSpacing: 1.1,
    textTransform: "uppercase",
    marginBottom: spacing.xs,
  },
  title: {
    fontSize: 28,
    fontFamily: fonts.extraBold,
    color: colors.text,
    marginBottom: spacing.xs,
    letterSpacing: -0.6,
  },
  subtitle: {
    fontSize: 15,
    fontFamily: fonts.regular,
    color: colors.textSecondary,
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  label: {
    fontSize: 13,
    fontFamily: fonts.semiBold,
    color: colors.textSecondary,
    marginBottom: spacing.sm,
    marginTop: spacing.lg,
  },

  input: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    fontSize: 16,
    fontFamily: fonts.regular,
    color: colors.text,
    backgroundColor: colors.surface,
  },

  button: {
    backgroundColor: colors.primary,
    borderRadius: radius.pill,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: spacing.xl,
    ...shadow,
    shadowColor: colors.primary,
    shadowOpacity: 0.28,
  },
  buttonDisabled: {
    opacity: 0.45,
    shadowOpacity: 0,
    elevation: 0,
  },
  buttonText: {
    color: colors.primaryText,
    fontSize: 16,
    fontFamily: fonts.bold,
    letterSpacing: -0.1,
  },

  secondaryButton: {
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: spacing.md,
    backgroundColor: colors.surface,
  },
  secondaryButtonText: {
    color: colors.text,
    fontSize: 15,
    fontFamily: fonts.semiBold,
  },

  errorText: {
    color: colors.danger,
    fontSize: 14,
    marginTop: spacing.md,
  },

  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    ...shadow,
  },

  badge: {
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: spacing.md,
    paddingVertical: 5,
    borderRadius: radius.pill,
  },
  badgeText: {
    fontSize: 12,
    fontFamily: fonts.semiBold,
  },

  chip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.lg,
    paddingVertical: 10,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: "transparent",
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    fontSize: 14,
    fontFamily: fonts.semiBold,
    color: colors.text,
  },
  chipTextActive: {
    color: colors.primaryDark,
  },

  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
  },

  fab: {
    position: "absolute",
    right: spacing.xl,
    bottom: spacing.xl,
    width: 60,
    height: 60,
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    ...shadow,
    shadowColor: colors.primary,
    shadowOpacity: 0.35,
  },

  progressTrack: {
    height: 8,
    borderRadius: radius.pill,
    backgroundColor: colors.card,
    overflow: "hidden",
  },
  progressFill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.primary,
  },
});
