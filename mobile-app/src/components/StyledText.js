// src/components/StyledText.js
// Componentes tipográficos reutilizables sobre <Text> para mantener la jerarquía
// sin repetir configuraciones de fuente en cada pantalla.

import React from 'react';
import { Text, StyleSheet } from 'react-native';

import { colors, FONTS, FONT_SIZES } from '../theme';

export const Heading = ({ children, style, ...props }) => (
  <Text style={[styles.heading, style]} {...props}>{children}</Text>
);

export const Subheading = ({ children, style, ...props }) => (
  <Text style={[styles.subheading, style]} {...props}>{children}</Text>
);

export const BodyText = ({ children, style, ...props }) => (
  <Text style={[styles.body, style]} {...props}>{children}</Text>
);

export const Label = ({ children, style, ...props }) => (
  <Text style={[styles.label, style]} {...props}>{children}</Text>
);

export const Caption = ({ children, style, ...props }) => (
  <Text style={[styles.caption, style]} {...props}>{children}</Text>
);

const styles = StyleSheet.create({
  heading: {
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.xl,
    color: colors.black,
  },
  subheading: {
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZES.lg,
    color: colors.onSurfaceVariant,
  },
  body: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.md,
    color: colors.black,
  },
  label: {
    fontFamily: FONTS.semibold,
    fontSize: FONT_SIZES.sm,
    color: colors.onSurfaceVariant,
  },
  caption: {
    fontFamily: FONTS.regular,
    fontSize: FONT_SIZES.xs,
    color: colors.onSurfaceVariant,
  },
});
