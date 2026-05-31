import React, { useState, useEffect } from 'react';
import { MapContainer, TileLayer, Polyline, Circle, CircleMarker, Popup, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Navigation, Clock, CheckCircle2 } from 'lucide-react';
import { useAuthStore } from '../../auth/store/useAuthStore';

// Declaramos que window.google existe (inyectado en index.html)
declare global {
  interface Window {
    google: any;
  }
}

// Coordenadas Reales Extraídas del Backend (excel_data.py - La Paz)
const PARADAS_OPTIMIZADAS = [
  { id: 1, nombre: 'Almacén Base', lat: -16.5300000, lng: -68.0500000, status: 'completado', hora: '08:00 AM' },
  { id: 2, nombre: 'Mercado Chasquipampa', lat: -16.5367867, lng: -68.0469685, status: 'completado', hora: '08:45 AM' },
  { id: 3, nombre: 'Mercado Achumani', lat: -16.5306310, lng: -68.0735448, status: 'en_ruta', hora: '09:30 AM (Est)' },
  { id: 4, nombre: 'Villa Armonía', lat: -16.5091174, lng: -68.1096591, status: 'pendiente', hora: '10:15 AM (Est)' },
  { id: 5, nombre: '10 de Enero', lat: -16.5019009, lng: -68.1046631, status: 'pendiente', hora: '11:00 AM (Est)' },
  { id: 6, nombre: 'San Antonio', lat: -16.4979223, lng: -68.1085645, status: 'pendiente', hora: '11:45 AM (Est)' },
  { id: 7, nombre: 'Cruce de Villas', lat: -16.4957719, lng: -68.1168489, status: 'pendiente', hora: '12:30 PM (Est)' }
];

const RUTA_LATLNG_FALLBACK: [number, number][] = PARADAS_OPTIMIZADAS.map(p => [p.lat, p.lng]);
const VEHICULO_ACTUAL: [number, number] = [-16.5330000, -68.0600000]; // En tránsito entre Chasquipampa y Achumani

export const RutasMapaPage: React.FC = () => {
  const user = useAuthStore(state => state.user);
  const [selectedStop, setSelectedStop] = useState(3);
  const [routePath, setRoutePath] = useState<[number, number][]>([]);

  // Efecto para calcular la ruta exacta por calles usando Google Maps API
  useEffect(() => {
    // Retrasamos un poco la llamada para asegurar que el script de Google se cargó en index.html
    const fetchGoogleRoute = () => {
      if (!window.google || !window.google.maps) {
        console.warn("Google Maps no está cargado. Usando fallback de líneas rectas.");
        setRoutePath(RUTA_LATLNG_FALLBACK);
        return;
      }

      const directionsService = new window.google.maps.DirectionsService();
      
      const origin = { lat: PARADAS_OPTIMIZADAS[0].lat, lng: PARADAS_OPTIMIZADAS[0].lng };
      const destination = { lat: PARADAS_OPTIMIZADAS[PARADAS_OPTIMIZADAS.length - 1].lat, lng: PARADAS_OPTIMIZADAS[PARADAS_OPTIMIZADAS.length - 1].lng };
      
      const waypoints = PARADAS_OPTIMIZADAS.slice(1, -1).map(p => ({
        location: { lat: p.lat, lng: p.lng },
        stopover: true
      }));

      directionsService.route(
        {
          origin,
          destination,
          waypoints,
          optimizeWaypoints: true, // Habilita el algoritmo TSP de Google
          travelMode: window.google.maps.TravelMode.DRIVING,
        },
        (result: any, status: string) => {
          if (status === window.google.maps.DirectionsStatus.OK && result) {
            // Unimos todos los puntos "overview_path" para dibujar la polilínea hiperrealista
            const path: [number, number][] = [];
            result.routes[0].legs.forEach((leg: any) => {
              leg.steps.forEach((step: any) => {
                step.path.forEach((p: any) => {
                  path.push([p.lat(), p.lng()]);
                });
              });
            });
            setRoutePath(path);
          } else {
            console.error(`Error de Google Maps: ${status}`);
            setRoutePath(RUTA_LATLNG_FALLBACK);
          }
        }
      );
    };

    setTimeout(fetchGoogleRoute, 1000); // Esperar a que init inyectado cargue
  }, []);

  // Título contextual según el rol
  const getTituloContextual = () => {
    if (!user || !user.role) return 'Seguimiento de Flota';
    const role = user.role.toLowerCase();
    if (role === 'administrador' || role === 'admin') {
      return 'Ruta Óptima de Flota (Vista Administrador)';
    } else if (role === 'supervisor') {
      return 'Ruta Óptima de Flota (Vista Supervisor)';
    } else {
      return 'Mi Ruta Óptima (Vista Reponedor/Repartidor)';
    }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-4 flex justify-between items-end">
        <div>
          <h2 className="text-2xl font-bold text-[#003366]">{getTituloContextual()}</h2>
          <p className="text-gray-500 flex items-center gap-2">
            Ruteo hiperrealista potenciado por Inteligencia Artificial y Google Maps.
            <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded font-semibold border border-blue-200">
              {PARADAS_OPTIMIZADAS.length} Puntos de Entrega
            </span>
          </p>
        </div>
        <div className="flex gap-2">
          <span className="bg-green-100 text-green-800 text-xs font-bold px-3 py-1 rounded-full flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
            GPS Vehículo VEN-01 Activo
          </span>
        </div>
      </div>

      <div className="flex-1 flex gap-4 min-h-0">
        
        {/* Panel Lateral de Itinerario (Timeline) */}
        <div className="w-80 bg-white rounded-xl shadow-sm border border-gray-100 p-0 flex flex-col overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-700 uppercase text-xs tracking-wider flex items-center gap-2">
              <Navigation className="w-4 h-4 text-[#003366]" />
              Itinerario Optimizado (IA)
            </h3>
          </div>
          
          <div className="flex-1 overflow-y-auto p-4">
            <div className="relative border-l-2 border-gray-200 ml-3 space-y-6">
              
              {PARADAS_OPTIMIZADAS.map((parada, idx) => (
                <div 
                  key={parada.id}
                  onClick={() => setSelectedStop(parada.id)}
                  className="relative pl-6 cursor-pointer group"
                >
                  <span className={`absolute -left-[9px] top-1 w-4 h-4 rounded-full border-2 border-white transition-colors
                    ${parada.status === 'completado' ? 'bg-[#5E7032]' : 
                      parada.status === 'en_ruta' ? 'bg-orange-500 animate-pulse' : 'bg-gray-300'}`}
                  ></span>
                  
                  <div className={`p-3 rounded-lg border transition-all 
                    ${selectedStop === parada.id ? 'border-blue-500 bg-blue-50 shadow-sm' : 'border-gray-100 group-hover:border-blue-300'}`}
                  >
                    <div className="flex justify-between items-start mb-1">
                      <h4 className={`font-bold text-sm ${parada.status === 'completado' ? 'text-gray-900' : 'text-gray-700'}`}>
                        {idx + 1}. {parada.nombre}
                      </h4>
                      {parada.status === 'completado' && <CheckCircle2 className="w-4 h-4 text-[#5E7032]" />}
                    </div>
                    <div className="flex items-center text-xs text-gray-500 gap-1 mt-1">
                      <Clock className="w-3 h-3" />
                      <span>{parada.hora}</span>
                    </div>
                  </div>
                </div>
              ))}

            </div>
          </div>
        </div>

        {/* Mapa de Tracking Multi-Parada */}
        <div className="flex-1 rounded-xl overflow-hidden shadow-sm border border-gray-200 relative z-0">
          <MapContainer 
            center={[-16.5150, -68.0850]} 
            zoom={13} 
            className="h-full w-full"
            zoomControl={true}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
            />
            
            {/* Ruta Planificada Optimizada (Google Maps API Geometry) */}
            {routePath.length > 0 && (
              <Polyline 
                positions={routePath} 
                pathOptions={{ color: '#003366', weight: 4, dashArray: '8, 8', opacity: 0.7 }} 
              />
            )}

            {/* Marcadores para cada Parada de la Ruta */}
            {PARADAS_OPTIMIZADAS.map((parada, idx) => (
              <React.Fragment key={parada.id}>
                <Circle 
                  center={[parada.lat, parada.lng]} 
                  radius={120} 
                  pathOptions={{ 
                    color: parada.status === 'completado' ? '#5E7032' : parada.status === 'en_ruta' ? '#f97316' : '#9ca3af', 
                    fillColor: parada.status === 'completado' ? '#5E7032' : parada.status === 'en_ruta' ? '#f97316' : '#9ca3af', 
                    fillOpacity: 0.15,
                    weight: 1
                  }} 
                />
                <CircleMarker
                  center={[parada.lat, parada.lng]}
                  radius={14}
                  pathOptions={{
                    color: '#fff',
                    fillColor: parada.status === 'completado' ? '#5E7032' : parada.status === 'en_ruta' ? '#f97316' : '#003366',
                    fillOpacity: 1,
                    weight: 2
                  }}
                >
                  <Tooltip direction="center" permanent className="bg-transparent border-none shadow-none text-white font-bold text-xs">
                    {idx + 1}
                  </Tooltip>
                  <Popup>
                    <div className="font-sans text-center px-2 py-1">
                      <h3 className="font-bold text-gray-900 text-sm mb-1">{parada.nombre}</h3>
                      <p className="text-xs text-gray-500 capitalize">Estado: {parada.status.replace('_', ' ')}</p>
                    </div>
                  </Popup>
                </CircleMarker>
              </React.Fragment>
            ))}

            {/* Vehículo en movimiento (Actualmente en tránsito) */}
            <CircleMarker
              center={VEHICULO_ACTUAL}
              radius={18}
              pathOptions={{ color: '#fff', fillColor: '#000', fillOpacity: 1, weight: 3 }}
            >
              <Tooltip direction="top" permanent className="font-bold border border-gray-800 rounded">
                VEN-01
              </Tooltip>
              <Popup>Camión VEN-01 (45 km/h) - En ruta a Achumani</Popup>
            </CircleMarker>

          </MapContainer>
        </div>
      </div>
    </div>
  );
};

export default RutasMapaPage;
