import React, { useCallback, useState } from 'react';
import {
  View, FlatList, TouchableOpacity, StyleSheet,
  ActivityIndicator, Alert, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

import { colors, SPACING, FONT_SIZES, FONTS, RADIUS, shadow } from '../theme';
import { commonStyles } from '../theme/commonStyles';
import { Heading, BodyText, Caption } from '../components/StyledText';
import AppButton from '../components/AppButton';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../context/AuthContext';
import { getSecureLocation } from '../hooks/useSecureLocation';

const STATUS_CONFIG = {
  pending:     { label: 'PENDIENTE',   color: colors.outlineVariant },
  in_progress: { label: 'EN VISITA',   color: colors.surfaceTint },
  completed:   { label: 'COMPLETADO',  color: colors.secondary },
  skipped:     { label: 'OMITIDO',     color: colors.error },
};

export default function HomeScreen({ navigation }) {
  const { logout } = useAuth();
  const { apiFetch } = useApi();
  const [ruta, setRuta] = useState(null);
  const [loading, setLoading] = useState(true);
  const [checkingIn, setCheckingIn] = useState(null); // stop_id en proceso

  useFocusEffect(
    useCallback(() => {
      cargarRuta();
    }, [])
  );

  async function cargarRuta() {
    setLoading(true);
    try {
      const res = await apiFetch('/api/logistica/rutas/hoy/');
      if (res.ok) setRuta(await res.json());
    } catch (e) {
      Alert.alert('Error', e.message);
    } finally {
      setLoading(false);
    }
  }

  async function iniciarRuta() {
    try {
      await apiFetch(`/api/logistica/rutas/${ruta.id}/iniciar/`, { method: 'POST' });
      cargarRuta();
    } catch (e) {
      Alert.alert('Error', e.message);
    }
  }

  async function hacerCheckin(stop) {
    setCheckingIn(stop.id);
    try {
      const gps = await getSecureLocation();

      const res = await apiFetch('/api/logistica/checkin/', {
        method: 'POST',
        body: JSON.stringify({ route_stop_id: stop.id, ...gps }),
      });

      const data = await res.json();

      if (!res.ok) {
        Alert.alert('Check-in rechazado', data.detail || JSON.stringify(data));
        return;
      }

      Alert.alert('✅ Check-in exitoso', 'Has llegado al punto de venta.');
      cargarRuta();
    } catch (e) {
      if (e.message === 'MOCK_LOCATION') {
        Alert.alert('🚫 Fraude detectado', 'Se detectó una app de GPS falso. El check-in fue bloqueado.');
      } else if (e.message === 'VELOCIDAD_IMPOSIBLE') {
        Alert.alert('🚫 Velocidad anómala', 'Tu velocidad actual es imposible. Antispoofing activado.');
      } else {
        Alert.alert('Error GPS', e.message);
      }
    } finally {
      setCheckingIn(null);
    }
  }

  async function omitirParada(stop) {
    Alert.alert(
      'Omitir parada',
      `¿Seguro que deseas omitir PDV ${stop.pdv.code}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Omitir',
          style: 'destructive',
          onPress: async () => {
            await apiFetch(`/api/logistica/paradas/${stop.id}/omitir/`, { method: 'POST' });
            cargarRuta();
          },
        },
      ]
    );
  }

  function renderStop({ item: stop }) {
    const cfg = STATUS_CONFIG[stop.status] ?? STATUS_CONFIG.pending;
    const isPending = stop.status === 'pending';
    const isInProgress = stop.status === 'in_progress';
    const isCheckingThisStop = checkingIn === stop.id;

    return (
      <View style={styles.stopCard}>
        <View style={styles.stopHeader}>
          <Caption style={styles.stopOrder}>#{stop.stop_order}</Caption>
          <View style={[styles.badge, { backgroundColor: cfg.color }]}>
            <Caption style={styles.badgeText}>{cfg.label}</Caption>
          </View>
        </View>

        <Heading style={styles.stopTitle}>PDV {stop.pdv.code}</Heading>
        <BodyText style={styles.stopMarket}>{stop.pdv.market_name}</BodyText>

        <View style={styles.stopMeta}>
          <Caption style={styles.metaText}>⏱ {stop.pdv.visit_minutes_estimated} min</Caption>
          <Caption style={styles.metaText}>
            📍 {stop.pdv.lat.toFixed(4)}, {stop.pdv.lng.toFixed(4)}
          </Caption>
        </View>

        {isPending && (
          <View style={styles.actions}>
            <AppButton
              title="CHECK-IN GPS"
              variant="primary"
              onPress={() => hacerCheckin(stop)}
              loading={isCheckingThisStop}
              style={styles.actionFlex}
            />
            <AppButton
              title="OMITIR"
              variant="outline"
              onPress={() => omitirParada(stop)}
              style={styles.btnOmitir}
              textStyle={styles.btnOmitirText}
            />
          </View>
        )}

        {isInProgress && (
          <AppButton
            title="REGISTRAR Y COMPLETAR"
            variant="success"
            onPress={() => navigation.navigate('TareaEnProceso', { stop })}
          />
        )}
      </View>
    );
  }

  if (loading) {
    return (
      <View style={[commonStyles.flex1, commonStyles.center]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!ruta) {
    return (
      <View style={[commonStyles.flex1, commonStyles.center, { padding: SPACING.xl }]}>
        <BodyText style={styles.emptyText}>No tienes ruta asignada para hoy.</BodyText>
        <AppButton title="Cerrar sesión" variant="ghost" onPress={logout} />
      </View>
    );
  }

  const pendientes = ruta.stops.filter(s => s.status === 'pending').length;
  const completados = ruta.stops.filter(s => s.status === 'completed').length;

  return (
    <SafeAreaView style={commonStyles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Heading style={styles.headerTitle}>Ruta del día</Heading>
          <Caption style={styles.headerSub}>{ruta.route_date} · {ruta.total_pdvs} PDVs</Caption>
        </View>
        <TouchableOpacity
          style={styles.btnMapa}
          onPress={() => navigation.navigate('Map', { ruta })}
          activeOpacity={0.85}
        >
          <Caption style={styles.btnMapaText}>VER MAPA →</Caption>
        </TouchableOpacity>
      </View>

      {/* Banner de progreso */}
      <View style={styles.progressBanner}>
        <Caption style={styles.progressText}>
          ✅ {completados} completados · ⏳ {pendientes} pendientes · ⏱ {ruta.total_estimated_minutes} min total
        </Caption>
        {ruta.status === 'pending' && (
          <AppButton
            title="INICIAR RUTA"
            variant="success"
            onPress={iniciarRuta}
            style={styles.btnIniciar}
            textStyle={styles.btnIniciarText}
          />
        )}
      </View>

      <FlatList
        data={ruta.stops}
        keyExtractor={s => s.id}
        renderItem={renderStop}
        contentContainerStyle={styles.list}
        refreshControl={<RefreshControl refreshing={loading} onRefresh={cargarRuta} />}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  emptyText: { color: colors.onSurfaceVariant, marginBottom: SPACING.lg },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.primary, paddingHorizontal: SPACING.lg, paddingVertical: SPACING.lg,
  },
  headerTitle: { fontSize: FONT_SIZES.lg, color: colors.white },
  headerSub: { color: colors.inversePrimary, marginTop: 2 },
  btnMapa: {
    backgroundColor: colors.surfaceTint, borderRadius: RADIUS.sm,
    paddingHorizontal: SPACING.md, paddingVertical: SPACING.sm,
  },
  btnMapaText: { fontFamily: FONTS.bold, color: colors.white, fontSize: FONT_SIZES.sm },

  progressBanner: {
    backgroundColor: colors.primaryContainer, padding: SPACING.md, alignItems: 'center', gap: SPACING.sm,
  },
  progressText: { color: colors.white, fontSize: FONT_SIZES.sm, textAlign: 'center' },
  btnIniciar: { height: 40, paddingHorizontal: SPACING.xl },
  btnIniciarText: { fontSize: FONT_SIZES.sm, letterSpacing: 1 },

  list: { padding: SPACING.md, gap: SPACING.sm + 2 },

  stopCard: {
    backgroundColor: colors.white, borderRadius: RADIUS.md, padding: SPACING.lg,
    ...shadow(2),
  },
  stopHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: SPACING.xs + 2 },
  stopOrder: { fontFamily: FONTS.semibold, fontSize: FONT_SIZES.sm, color: colors.onSurfaceVariant },
  badge: { borderRadius: RADIUS.sm - 2, paddingHorizontal: SPACING.sm, paddingVertical: 3 },
  badgeText: { fontFamily: FONTS.bold, fontSize: FONT_SIZES.xs, color: colors.white, letterSpacing: 0.5 },
  stopTitle: { fontSize: FONT_SIZES.lg, marginBottom: 2 },
  stopMarket: { color: colors.onSurfaceVariant, marginBottom: SPACING.sm },
  stopMeta: { flexDirection: 'row', gap: SPACING.lg, marginBottom: SPACING.md },
  metaText: { fontSize: FONT_SIZES.sm, color: colors.onSurfaceVariant },

  actions: { flexDirection: 'row', gap: SPACING.sm + 2 },
  actionFlex: { flex: 1 },
  btnOmitir: { borderColor: colors.error, paddingHorizontal: SPACING.lg },
  btnOmitirText: { color: colors.error },
});
