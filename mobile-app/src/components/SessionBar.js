// src/components/SessionBar.js
// Barra de sesión persistente, anclada al fondo de las pantallas autenticadas.
// Siempre visible: identidad + cronómetro de jornada, estado de conexión y
// acción "Finalizar jornada" (resumen del día + cierre de sesión).

import React, { useState } from 'react';
import { View, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, SPACING, FONT_SIZES, FONTS, RADIUS, shadow } from '../theme';
import { Caption } from './StyledText';
import { useAuth } from '../context/AuthContext';
import { useApi } from '../hooks/useApi';
import { useConnectivity } from '../hooks/useConnectivity';
import { useElapsedTime } from '../hooks/useElapsedTime';

export default function SessionBar() {
  const { user, loginTimestamp, logout } = useAuth();
  const { apiFetch } = useApi();
  const { isOnline } = useConnectivity();
  const elapsed = useElapsedTime(loginTimestamp);
  const insets = useSafeAreaInsets();
  const [finishing, setFinishing] = useState(false);

  const nombre = user?.firstName || user?.username || 'Reponedor';
  const rol = user?.role || 'Reponedor';

  async function finalizarJornada() {
    setFinishing(true);
    let resumen = null;
    try {
      const res = await apiFetch('/api/logistica/rutas/hoy/');
      if (res.ok) {
        const ruta = await res.json();
        const stops = ruta.stops || [];
        resumen = {
          completados: stops.filter((s) => s.status === 'completed').length,
          pendientes: stops.filter((s) => s.status === 'pending').length,
          omitidos: stops.filter((s) => s.status === 'skipped').length,
        };
      }
    } catch {
      // sin conexión / ruta no disponible → confirmación simple
    } finally {
      setFinishing(false);
    }

    let mensaje;
    if (resumen) {
      mensaje =
        `Resumen de hoy:\n` +
        `✅ ${resumen.completados} completados\n` +
        `⏳ ${resumen.pendientes} pendientes\n` +
        `⛔ ${resumen.omitidos} omitidos\n\n` +
        (resumen.pendientes > 0
          ? `Tienes ${resumen.pendientes} parada(s) pendiente(s). ¿Finalizar de todos modos?`
          : `¿Cerrar tu sesión de trabajo?`);
    } else {
      mensaje = 'No se pudo cargar el resumen (sin conexión). ¿Finalizar tu jornada y cerrar sesión?';
    }

    Alert.alert('Finalizar jornada', mensaje, [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Finalizar', style: 'destructive', onPress: () => logout() },
    ]);
  }

  return (
    <View style={[styles.bar, { paddingBottom: Math.max(insets.bottom, SPACING.sm) }]}>
      <View style={styles.left}>
        <View style={styles.row}>
          <View
            style={[
              styles.dot,
              { backgroundColor: isOnline ? colors.secondary : colors.error },
            ]}
          />
          <Caption style={styles.conn}>{isOnline ? 'En línea' : 'Sin conexión'}</Caption>
        </View>
        <Caption style={styles.identity} numberOfLines={1}>
          {nombre} · {rol} · ⏱ {elapsed}
        </Caption>
      </View>

      <TouchableOpacity
        style={styles.finishBtn}
        onPress={finalizarJornada}
        disabled={finishing}
        activeOpacity={0.85}
        accessibilityRole="button"
        accessibilityLabel="Finalizar jornada y cerrar sesión"
      >
        {finishing ? (
          <ActivityIndicator color={colors.white} size="small" />
        ) : (
          <Caption style={styles.finishText}>FINALIZAR JORNADA</Caption>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.white,
    paddingHorizontal: SPACING.lg,
    paddingTop: SPACING.sm,
    borderTopWidth: 1,
    borderTopColor: colors.outlineVariant,
    ...shadow(8),
  },
  left: { flex: 1, marginRight: SPACING.md },
  row: { flexDirection: 'row', alignItems: 'center', marginBottom: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginRight: SPACING.xs },
  conn: { fontSize: FONT_SIZES.xs, color: colors.onSurfaceVariant, fontFamily: FONTS.semibold },
  identity: { fontSize: FONT_SIZES.sm, color: colors.black, fontFamily: FONTS.medium },
  finishBtn: {
    backgroundColor: colors.primary,
    borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md,
    paddingVertical: SPACING.sm + 2,
  },
  finishText: {
    color: colors.white,
    fontFamily: FONTS.bold,
    fontSize: FONT_SIZES.xs,
    letterSpacing: 0.5,
  },
});
