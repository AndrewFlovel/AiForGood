// src/components/AppButton.js
// Botón temático reutilizable. Centraliza variantes, estados y tipografía para
// evitar duplicar estilos de botón en cada pantalla.
//
// Variantes: 'primary' (navy) | 'success' (verde) | 'outline' | 'ghost'

import React, { useMemo } from 'react';
import { Text, TouchableOpacity, ActivityIndicator, StyleSheet } from 'react-native';

import { colors, FONTS, FONT_SIZES, SPACING, RADIUS } from '../theme';

export default function AppButton({
  title,
  onPress,
  variant = 'primary',
  loading = false,
  disabled = false,
  style,
  textStyle,
}) {
  const isDisabled = disabled || loading;

  const containerStyle = useMemo(
    () => [
      styles.base,
      styles[`${variant}Bg`],
      isDisabled && styles.disabled,
      style,
    ],
    [variant, isDisabled, style],
  );

  const labelStyle = useMemo(
    () => [styles.text, styles[`${variant}Text`], textStyle],
    [variant, textStyle],
  );

  const spinnerColor = variant === 'outline' || variant === 'ghost' ? colors.primary : colors.white;

  return (
    <TouchableOpacity
      style={containerStyle}
      onPress={onPress}
      disabled={isDisabled}
      activeOpacity={0.85}
    >
      {loading ? (
        <ActivityIndicator color={spinnerColor} />
      ) : (
        <Text style={labelStyle}>{title}</Text>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: {
    height: 52,
    borderRadius: RADIUS.md,
    paddingHorizontal: SPACING.lg,
    justifyContent: 'center',
    alignItems: 'center',
  },
  text: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.md,
    letterSpacing: 0.5,
  },

  primaryBg: { backgroundColor: colors.primary },
  primaryText: { color: colors.white },

  successBg: { backgroundColor: colors.secondary },
  successText: { color: colors.white },

  outlineBg: {
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: colors.primary,
  },
  outlineText: { color: colors.primary },

  ghostBg: { backgroundColor: 'transparent' },
  ghostText: { color: colors.primary },

  disabled: { backgroundColor: colors.outlineVariant, borderColor: colors.outlineVariant },
});
