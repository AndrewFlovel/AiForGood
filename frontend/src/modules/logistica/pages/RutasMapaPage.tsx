import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Circle, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Truck, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { StatusBadge } from '../components/StatusBadge';
import { useAuthStore } from '../../auth/store/useAuthStore';
import type { RutaHoy } from '../types/api';

const BRAND = { primary: '#001E40', secondary: '#1B6D24', tertiary: '#BA1A1A' } as const;

// Fallback mock: coordenadas La Paz para cuando no hay ruta real
const BASE = [-16.4950, -68.1300] as [number, number];
const DESTINO_MOCK = [-16.5367, -68.0924] as [number, number];
const VEHICULO_MOCK = [-16.5150, -68.1100] as [number, number];
const RUTA_MOCK: [number, number][] = [BASE, [-16.5050, -68.1200], VEHICULO_MOCK, DESTINO_MOCK];

export const RutasMapaPage: React.FC = () => {
  const [selectedStop, setSelectedStop] = useState<string | null>(null);
  const [rutaHoy, setRutaHoy] = useState<RutaHoy | null>(null);
  const [rutaError, setRutaError] = useState<string | null>(null);
  const { getAuthHeaders } = useAuthStore();

  useEffect(() => {
    const cargar = async () => {
      try {
        const res = await fetch('/api/logistica/rutas/hoy/', { headers: getAuthHeaders() });
        if (res.ok) setRutaHoy(await res.json());
      } catch {
        setRutaError('No se pudo cargar la ruta de hoy');
      }
    };
    cargar();
  }, [getAuthHeaders]);

  const stopsConUbicacion = rutaHoy?.stops.filter(
    (s) => s.pdv.lat && s.pdv.lng
  ) ?? [];

  const mapCenter: [number, number] =
    stopsConUbicacion.length > 0
      ? [stopsConUbicacion[0].pdv.lat, stopsConUbicacion[0].pdv.lng]
      : VEHICULO_MOCK;

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-venaris-primary">
            Seguimiento de Flota (Geofencing)
          </h2>
          <p className="text-gray-500 text-sm">
            Monitoreo en tiempo real de rutas y cruce de geocercas.
          </p>
        </div>
        <div className="flex gap-2 items-center">
          {rutaHoy && (
            <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              {stopsConUbicacion.length} paradas · {rutaHoy.total_distance_km} km
            </span>
          )}
          <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            GPS Activo
          </span>
        </div>
      </div>

      {rutaError && (
        <p className="text-xs text-amber-600 mb-2">
          {rutaError} — mostrando datos de demostración.
        </p>
      )}

      <div className="flex-1 flex gap-4 min-h-0">

        {/* Panel Lateral */}
        <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-100 p-4 flex flex-col gap-3 overflow-y-auto">
          <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider mb-2">
            {rutaHoy ? 'Paradas de Ruta' : 'Unidades Activas'}
          </h3>

          {/* Paradas reales desde la API */}
          {stopsConUbicacion.length > 0 ? (
            stopsConUbicacion.map((stop) => (
              <div
                key={stop.id}
                onClick={() => setSelectedStop(stop.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedStop === stop.id
                    ? 'border-venaris-primary bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-venaris-primary/40'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-6 h-6 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                      style={{ backgroundColor: BRAND.primary }}
                    >
                      {stop.stop_order}
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">{stop.pdv.code}</h4>
                      <p className="text-xs text-gray-400">{stop.pdv.market_name ?? ''}</p>
                    </div>
                  </div>
                  <StatusBadge status={stop.status} />
                </div>
                <div className="text-xs text-gray-500 flex justify-between mt-1">
                  <span>{stop.estimated_minutes} min est.</span>
                  {stop.distance_from_prev_km !== '0.000' && (
                    <span>{stop.distance_from_prev_km} km</span>
                  )}
                </div>
              </div>
            ))
          ) : (
            /* Fallback mock: tarjetas hardcodeadas */
            <>
              <div
                onClick={() => setSelectedStop('ven01')}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedStop === 'ven01'
                    ? 'border-venaris-primary bg-blue-50 shadow-sm'
                    : 'border-gray-200 hover:border-venaris-primary/40'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md" style={{ backgroundColor: BRAND.primary }}>
                      <Truck className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">Camión VEN-01</h4>
                      <p className="text-xs text-gray-500">Ruta Sur (Irpavi)</p>
                    </div>
                  </div>
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <p className="flex justify-between">
                    <span>Velocidad:</span><span className="font-medium">45 km/h</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Estado:</span>
                    <span className="font-medium text-green-600">En Ruta (A tiempo)</span>
                  </p>
                </div>
              </div>

              <div
                onClick={() => setSelectedStop('ven04')}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedStop === 'ven04'
                    ? 'border-venaris-tertiary bg-red-50 shadow-sm'
                    : 'border-gray-200 hover:border-venaris-tertiary/40'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-md" style={{ backgroundColor: BRAND.tertiary }}>
                      <Truck className="w-4 h-4 text-white" />
                    </div>
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">Camión VEN-04</h4>
                      <p className="text-xs text-gray-500">Ruta Centro</p>
                    </div>
                  </div>
                  <AlertTriangle className="w-5 h-5 text-venaris-tertiary animate-pulse" />
                </div>
                <div className="text-xs text-gray-600 space-y-1">
                  <p className="flex justify-between">
                    <span>Velocidad:</span><span className="font-medium">0 km/h</span>
                  </p>
                  <p className="flex justify-between">
                    <span>Estado:</span>
                    <span className="font-medium text-venaris-tertiary">Desvío de Geocerca (150m)</span>
                  </p>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Mapa */}
        <div className="flex-1 rounded-xl overflow-hidden shadow-sm border border-gray-200 relative z-0">
          <MapContainer
            center={mapCenter}
            zoom={stopsConUbicacion.length > 0 ? 13 : 14}
            className="h-full w-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />

            {stopsConUbicacion.length > 0 ? (
              /* Stops reales */
              stopsConUbicacion.map((stop) => (
                <CircleMarker
                  key={stop.id}
                  center={[stop.pdv.lat, stop.pdv.lng]}
                  radius={9}
                  pathOptions={{
                    color: '#fff',
                    fillColor: stop.status === 'completed' ? BRAND.secondary : BRAND.primary,
                    fillOpacity: 0.9,
                    weight: 2,
                  }}
                >
                  <Popup>
                    <div className="text-sm font-sans">
                      <p className="font-bold">{stop.pdv.code}</p>
                      <p className="text-xs text-gray-500">Parada #{stop.stop_order}</p>
                      <StatusBadge status={stop.status} />
                    </div>
                  </Popup>
                </CircleMarker>
              ))
            ) : (
              /* Fallback mock */
              <>
                <Circle
                  center={BASE}
                  radius={100}
                  pathOptions={{ color: BRAND.primary, fillColor: BRAND.primary, fillOpacity: 0.2 }}
                >
                  <Popup>Almacén Central (Geocerca 100m)</Popup>
                </Circle>
                <Circle
                  center={DESTINO_MOCK}
                  radius={100}
                  pathOptions={{ color: BRAND.secondary, fillColor: BRAND.secondary, fillOpacity: 0.2 }}
                >
                  <Popup>Ketal Megacenter (Geocerca 100m)</Popup>
                </Circle>
                <Polyline
                  positions={RUTA_MOCK}
                  pathOptions={{ color: BRAND.primary, weight: 4, dashArray: '10, 10' }}
                />
                <CircleMarker
                  center={VEHICULO_MOCK}
                  radius={12}
                  pathOptions={{ color: '#fff', fillColor: BRAND.primary, fillOpacity: 1, weight: 3 }}
                >
                  <Popup>
                    <div className="font-sans text-center text-sm">
                      <p className="font-bold">VEN-01</p>
                      <p className="text-xs text-gray-500">45 km/h</p>
                    </div>
                  </Popup>
                </CircleMarker>
              </>
            )}
          </MapContainer>
        </div>

      </div>
    </div>
  );
};

export default RutasMapaPage;
