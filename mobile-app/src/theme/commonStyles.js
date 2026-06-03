// src/theme/commonStyles.js
// Utilidades de layout compartidas para evitar repetir flexbox/alineaciones.

import { StyleSheet } from 'react-native';

import { colors, SPACING, RADIUS, shadow } from './index';

export const commonStyles = StyleSheet.create({
  flex1: { flex: 1 },
  row: { flexDirection: 'row' },
  rowCenter: { flexDirection: 'row', alignItems: 'center' },
  center: { justifyContent: 'center', alignItems: 'center' },
  spaceBetween: { justifyContent: 'space-between' },
  alignCenter: { alignItems: 'center' },

  screen: {
    flex: 1,
    backgroundColor: colors.surface,
  },

  // Tarjeta blanca estándar con sombra suave.
  card: {
    backgroundColor: colors.white,
    borderRadius: RADIUS.md,
    padding: SPACING.lg,
    ...shadow(2),
  },
});
