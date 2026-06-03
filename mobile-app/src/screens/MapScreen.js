import React, { useEffect, useRef, useState } from 'react';
import {
  View, StyleSheet, TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import MapView, { Marker, Polyline, PROVIDER_GOOGLE } from 'react-native-maps';
import Constants from 'expo-constants';

import { colors, SPACING, FONT_SIZES, FONTS, RADIUS } from '../theme';
import { commonStyles } from '../theme/commonStyles';
import { Heading, Caption } from '../components/StyledText';
import { GOOGLE_MAPS_API_KEY } from '../constants/api';
import { getMapLocation } from '../hooks/useSecureLocation';

// En Expo Go no se puede usar PROVIDER_GOOGLE (requiere build nativo con la API key compilada)
const isExpoGo = Constants.appOwnership === 'expo';
const mapProvider = (!isExpoGo && GOOGLE_MAPS_API_KEY) ? PROVIDER_GOOGLE : undefined;

// Decodifica el formato Encoded Polyline de Google Maps
function decodePolyline(encoded) {
  const points = [];
  let index = 0, lat = 0, lng = 0;
  while (index < encoded.length) {
    let b, shift = 0, result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lat += (result & 1) ? ~(result >> 1) : result >> 1;
    shift = 0; result = 0;
    do { b = encoded.charCodeAt(index++) - 63; result |= (b & 0x1f) << shift; shift += 5; } while (b >= 0x20);
    lng += (result & 1) ? ~(result >> 1) : result >> 1;
    points.push({ latitude: lat / 1e5, longitude: lng / 1e5 });
  }
  return points;
}

const MARKER_COLORS = {
  pending:     'gray',
  in_progress: colors.surfaceTint,
  completed:   colors.secondary,
  skipped:     colors.error,
};

export default function MapScreen({ route, navigation }) {
  const { ruta } = route.params;
  const mapRef = useRef(null);
  const [routeCoords, setRouteCoords] = useState([]);
  const [userLocation, setUserLocation] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);

  const stops = ruta.stops ?? [];

  // Región inicial centrada en los PDVs
  const initialRegion = stops.length > 0
    ? {
        latitude: stops[0].pdv.lat,
        longitude: stops[0].pdv.lng,
        latitudeDelta: 0.08,
        longitudeDelta: 0.08,
      }
    : { latitude: -16.5, longitude: -68.15, latitudeDelta: 0.1, longitudeDelta: 0.1 };

  useEffect(() => {
    cargarUbicacionUsuario();
    if (GOOGLE_MAPS_API_KEY) {
      cargarRutaGoogleMaps();
    }
  }, []);

  async function cargarUbicacionUsuario() {
    const loc = await getMapLocation();
    if (loc) setUserLocation(loc);
  }

  async function cargarRutaGoogleMaps() {
    const stopsOrdenados = [...stops].sort((a, b) => a.stop_order - b.stop_order);
    if (stopsOrdenados.length < 2) return;

    setLoadingRoute(true);
    try {
      const origin = `${stopsOrdenados[0].pdv.lat},${stopsOrdenados[0].pdv.lng}`;
      const destination = `${stopsOrdenados.at(-1).pdv.lat},${stopsOrdenados.at(-1).pdv.lng}`;
      const waypoints = stopsOrdenados
        .slice(1, -1)
        .map(s => `${s.pdv.lat},${s.pdv.lng}`)
        .join('|');

      const url = [
        'https://maps.googleapis.com/maps/api/directions/json',
        `?origin=${origin}`,
        `&destination=${destination}`,
        waypoints ? `&waypoints=optimize:false|${waypoints}` : '',
        `&mode=driving`,
        `&key=${GOOGLE_MAPS_API_KEY}`,
      ].join('');

      const res = await fetch(url);
      const data = await res.json();

      if (data.status === 'OK') {
        const encoded = data.routes[0].overview_polyline.points;
        setRouteCoords(decodePolyline(encoded));
      } else {
        Alert.alert('Google Maps', `No se pudo trazar la ruta: ${data.status}`);
      }
    } catch {
      Alert.alert('Error', 'No se pudo obtener la ruta de Google Maps.');
    } finally {
      setLoadingRoute(false);
    }
  }

  function ajustarMapa() {
    if (!mapRef.current || stops.length === 0) return;
    const coords = stops.map(s => ({ latitude: s.pdv.lat, longitude: s.pdv.lng }));
    if (userLocation) coords.push(userLocation);
    mapRef.current.fitToCoordinates(coords, {
      edgePadding: { top: 60, right: 40, bottom: 60, left: 40 },
      animated: true,
    });
  }

  return (
    <View style={commonStyles.screen}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.btnBack} activeOpacity={0.7}>
          <Caption style={styles.btnBackText}>← Volver</Caption>
        </TouchableOpacity>
        <Heading style={styles.headerTitle}>Mapa de Ruta</Heading>
        <TouchableOpacity onPress={ajustarMapa} style={styles.btnFit} activeOpacity={0.85}>
          <Caption style={styles.btnFitText}>Ajustar</Caption>
        </TouchableOpacity>
      </View>

      <MapView
        ref={mapRef}
        style={commonStyles.flex1}
        provider={mapProvider}
        initialRegion={initialRegion}
        showsUserLocation={true}
        showsMyLocationButton={true}
      >
        {/* Marcadores de PDVs */}
        {stops.map(stop => (
          <Marker
            key={stop.id}
            coordinate={{ latitude: stop.pdv.lat, longitude: stop.pdv.lng }}
            title={`#${stop.stop_order} · ${stop.pdv.code}`}
            description={`${stop.pdv.market_name} · ${stop.pdv.visit_minutes_estimated} min`}
            pinColor={MARKER_COLORS[stop.status] ?? 'gray'}
          />
        ))}

        {/* Polyline de ruta Google Maps */}
        {routeCoords.length > 0 && (
          <Polyline
            coordinates={routeCoords}
            strokeColor={colors.surfaceTint}
            strokeWidth={4}
          />
        )}

        {/* Línea de marcadores directa si no hay Google Maps key */}
        {routeCoords.length === 0 && stops.length > 1 && (
          <Polyline
            coordinates={[...stops]
              .sort((a, b) => a.stop_order - b.stop_order)
              .map(s => ({ latitude: s.pdv.lat, longitude: s.pdv.lng }))}
            strokeColor={colors.outlineVariant}
            strokeWidth={2}
            lineDashPattern={[8, 4]}
          />
        )}
      </MapView>

      {/* Leyenda */}
      <View style={styles.legend}>
        {loadingRoute && (
          <View style={styles.legendRow}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Caption style={styles.legendText}> Cargando ruta Google Maps...</Caption>
          </View>
        )}
        {!GOOGLE_MAPS_API_KEY && (
          <Caption style={styles.legendWarning}>
            ⚠ Configura GOOGLE_MAPS_API_KEY para ver la ruta real
          </Caption>
        )}
        <View style={styles.legendRow}>
          {Object.entries(MARKER_COLORS).map(([status, color]) => (
            <View key={status} style={styles.legendItem}>
              <View style={[styles.dot, { backgroundColor: color }]} />
              <Caption style={styles.legendText}>{status}</Caption>
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: colors.primary, paddingHorizontal: SPACING.lg, paddingTop: SPACING.xxl + SPACING.lg, paddingBottom: SPACING.lg,
  },
  headerTitle: { fontSize: FONT_SIZES.lg, color: colors.white },
  btnBack: { padding: SPACING.xs },
  btnBackText: { fontFamily: FONTS.semibold, color: colors.inversePrimary, fontSize: FONT_SIZES.md },
  btnFit: { backgroundColor: colors.surfaceTint, borderRadius: RADIUS.sm, paddingHorizontal: SPACING.sm + 2, paddingVertical: SPACING.xs + 2 },
  btnFitText: { fontFamily: FONTS.semibold, color: colors.white, fontSize: FONT_SIZES.sm },

  legend: {
    backgroundColor: colors.white, padding: SPACING.md,
    borderTopWidth: 1, borderTopColor: colors.outlineVariant,
    gap: SPACING.xs + 2,
  },
  legendRow: { flexDirection: 'row', flexWrap: 'wrap', gap: SPACING.md, alignItems: 'center' },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: SPACING.xs },
  dot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontSize: FONT_SIZES.xs, color: colors.onSurfaceVariant },
  legendWarning: { fontSize: FONT_SIZES.xs, color: colors.error },
});
