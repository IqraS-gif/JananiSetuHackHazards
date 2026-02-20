export const colors = {
  primary: "#FF5C8A",
  secondary: "#6C63FF",
  success: "#00C896",
  warning: "#FFB020",
  danger: "#FF5C5C",
  background: "#FFF7FA",
  cardGradientBlue: ["#1e3a8a", "#3b82f6"],
  cardGradientPink: ["#881337", "#e11d48"],
  cardGradientPurple: ["#4a1d96", "#7c3aed"],
  cardGradientGreen: ["#064e3b", "#059669"],
  cardGradientOrange: ["#7c2d12", "#ea580c"],
  text: "#1F2937",
  textSecondary: "#4B5563",
  textLight: "#9CA3AF",
  white: "#FFFFFF",
  black: "#000000",
  border: "#E5E7EB",
};

export const typography = {
  headingXL: { fontFamily: "Outfit_800ExtraBold", fontSize: 32, lineHeight: 40 },
  headingL: { fontFamily: "Outfit_700Bold", fontSize: 24, lineHeight: 32 },
  headingM: { fontFamily: "Outfit_600SemiBold", fontSize: 20, lineHeight: 28 },
  headingS: { fontFamily: "Outfit_600SemiBold", fontSize: 18, lineHeight: 26 },
  bodyL: { fontFamily: "Outfit_400Regular", fontSize: 16, lineHeight: 24 },
  bodyM: { fontFamily: "Outfit_400Regular", fontSize: 14, lineHeight: 20 },
  bodyS: { fontFamily: "Outfit_400Regular", fontSize: 12, lineHeight: 16 },
  label: { fontFamily: "Outfit_500Medium", fontSize: 14, lineHeight: 20 },
  caption: { fontFamily: "Outfit_400Regular", fontSize: 10, lineHeight: 14 },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  round: 9999,
};

export const shadows = {
  cardShadow: {
    shadowColor: "#FF5C8A",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  floatingShadow: {
    shadowColor: "#6C63FF",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 8,
  },
  baseShadow: {
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  }
};

export const animation = {
  fast: 200,
  medium: 400,
  slow: 800,
};

export const designSystem = {
  colors,
  typography,
  spacing,
  borderRadius,
  shadows,
  animation,
};

export default designSystem;
