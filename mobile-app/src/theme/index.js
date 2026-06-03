// src/theme/index.js
// Sistema de diseño centralizado de Venado Logística.
// Punto único de verdad para colores, espaciado, tipografía, radios y sombras.
// Nunca hardcodear estos valores en las pantallas: impórtalos siempre desde aquí.

import { Platform } from 'react-native';

import { colors } from './colors';

// Re-exportamos los colores de marca (theme/colors.js es la fuente de marca).
export { colors };
export const COLORS = colors;

// Escala de espaciado (múltiplos de 4) para paddings, margins y gaps.
export const SPACING = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};

// Escala tipográfica.
export const FONT_SIZES = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 17,
  xl: 20,
  xxl: 24,
  display: 40,
};

// Familias HankenGrotesk cargadas en App.js (mapeo por "peso" semántico).
export const FONTS = {
  regular: 'HankenGrotesk_400Regular',
  medium: 'HankenGrotesk_500Medium',
  semibold: 'HankenGrotesk_600SemiBold',
  bold: 'HankenGrotesk_700Bold',
  extrabold: 'HankenGrotesk_800ExtraBold',
};

// Radios de borde.
export const RADIUS = {
  sm: 6,
  md: 10,
  lg: 16,
  pill: 999,
};

// Helper de sombra multiplataforma (iOS usa shadow*, Android usa elevation).
export const shadow = (elevation = 2) =>
  Platform.select({
    ios: {
      shadowColor: colors.black,
      shadowOffset: { width: 0, height: Math.ceil(elevation / 2) },
      shadowOpacity: 0.08,
      shadowRadius: elevation * 1.5,
    },
    android: { elevation },
  });
