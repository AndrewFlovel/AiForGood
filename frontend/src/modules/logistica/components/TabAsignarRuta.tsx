import React, { useEffect, useState, useMemo } from 'react';
import { MapContainer, TileLayer, CircleMarker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import { Sparkles, Route as RouteIcon, CheckCircle2, MapPin, User } from 'lucide-react';
import { useRegistroStore } from '../store/useRegistroStore';
import type { CategoriaCliente } from '../types/api';

const BRAND = { primary: '#001E40', secondary: '#1B6D24', amber: '#F59E0B' } as const;

const hoyISO = () => new Date().toISOString().slice(0, 10);

export const TabAsignarRuta: React.FC = () => {
  const {
    pdvsDisponibles,
    fetchPdvsDisponibles,
    sugerencias,
    loadingSugerencia,
    sugerirReponedor,
    crearRuta,
  } = useRegistroStore();

  const [fecha, setFecha] = useState(hoyISO());
  const [seleccionados, setSeleccionados] = useState<Set<string>>(new Set());
  const [filtro, setFiltro] = useState<CategoriaCliente | 'TODOS'>('TODOS');
  const [reponedorElegido, setReponedorElegido] = useState<number | null>(null);
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchPdvsDisponibles(fecha);
    setSeleccionados(new Set());
    setReponedorElegido(null);
  }, [fecha, fetchPdvsDisponibles]);

  const visibles = pdvsDisponibles.filter((p) => filtro === 'TODOS' || p.categoria === filtro);

  const toggle = (id: string) => {
    setSeleccionados((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const pdvsSeleccionados = useMemo(
    () => pdvsDisponibles.filter((p) => seleccionados.has(p.id)),
    [pdvsDisponibles, seleccionados]
  );

  const centroMapa = useMemo<[number, number]>(() => {
    const pts = pdvsSeleccionados.length ? pdvsSeleccionados : pdvsDisponibles;
    if (pts.length === 0) return [-17.7833, -63.1821]; // Santa Cruz
    const lat = pts.reduce((s, p) => s + p.lat, 0) / pts.length;
    const lng = pts.reduce((s, p) => s + p.lng, 0) / pts.length;
    return [lat, lng];
  }, [pdvsSeleccionados, pdvsDisponibles]);

  const handleSugerir = async () => {
    setError(null);
    if (seleccionados.size === 0) {
      setError('Selecciona al menos un local.');
      return;
    }
    try {
      await sugerirReponedor([...seleccionados]);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al sugerir');
    }
  };

  const handleAsignar = async () => {
    setError(null);
    setMensaje(null);
    if (!reponedorElegido || seleccionados.size === 0) {
      setError('Selecciona locales y un reponedor.');
      return;
    }
    setCreando(true);
    try {
      await crearRuta(reponedorElegido, [...seleccionados], fecha);
      setMensaje('Ruta asignada correctamente.');
      setSeleccionados(new Set());
      setReponedorElegido(null);
      await fetchPdvsDisponibles(fecha);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al asignar ruta');
    } finally {
      setCreando(false);
    }
  };

  return (
    <div>
      <div className="flex flex-wrap items-end gap-4 mb-5">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha de la ruta</label>
          <input
            type="date"
            value={fecha}
            onChange={(e) => setFecha(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-venaris-primary outline-none"
          />
        </div>
        <p className="text-sm text-gray-500 pb-2">
          {seleccionados.size} local{seleccionados.size !== 1 && 'es'} seleccionado
          {seleccionados.size !== 1 && 's'}
        </p>
      </div>

      {mensaje && (
        <div className="mb-4 flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-lg">
          <CheckCircle2 className="w-4 h-4" /> {mensaje}
        </div>
      )}
      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-venaris-tertiary text-sm px-4 py-2 rounded-lg">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Panel izquierdo: PDVs disponibles */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 flex flex-col">
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
              <MapPin className="w-4 h-4 text-venaris-primary" /> Locales disponibles
            </h3>
            <div className="flex gap-1 bg-gray-100 rounded-lg p-0.5">
              {(['TODOS', 'MAYORISTA', 'MINORISTA', 'DETALLISTA'] as const).map((c) => (
                <button
                  key={c}
                  onClick={() => setFiltro(c)}
                  className={`px-2 py-1 text-[10px] font-semibold rounded transition-colors ${
                    filtro === c ? 'bg-white text-venaris-primary shadow-sm' : 'text-gray-500'
                  }`}
                >
                  {c === 'TODOS' ? 'Todos' : c.charAt(0) + c.slice(1, 3).toLowerCase()}
                </button>
              ))}
            </div>
          </div>
          <div className="max-h-[420px] overflow-y-auto p-3 space-y-2">
            {visibles.map((p) => {
              const sel = seleccionados.has(p.id);
              return (
                <label
                  key={p.id}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all ${
                    sel
                      ? 'border-venaris-primary bg-blue-50'
                      : 'border-gray-200 hover:border-venaris-primary/40'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={sel}
                    onChange={() => toggle(p.id)}
                    className="w-4 h-4 accent-venaris-primary"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-gray-900">{p.code}</span>
                      <span className="text-xs text-gray-400">{p.categoria}</span>
                    </div>
                    <p className="text-xs text-gray-500 truncate">{p.market_name}</p>
                  </div>
                </label>
              );
            })}
            {visibles.length === 0 && (
              <p className="text-center py-10 text-gray-400 text-sm">
                No hay locales disponibles para esta fecha.
              </p>
            )}
          </div>
        </div>

        {/* Panel derecho: mapa + reponedores */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden h-56 relative z-0">
            <MapContainer center={centroMapa} zoom={12} className="h-full w-full">
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              {pdvsSeleccionados.map((p) => (
                <CircleMarker
                  key={p.id}
                  center={[p.lat, p.lng]}
                  radius={8}
                  pathOptions={{ color: '#fff', fillColor: BRAND.primary, fillOpacity: 0.9, weight: 2 }}
                >
                  <Popup>
                    <strong>{p.code}</strong> — {p.categoria}
                  </Popup>
                </CircleMarker>
              ))}
              {sugerencias
                .filter((s) => s.ultima_ubicacion)
                .map((s) => (
                  <CircleMarker
                    key={s.id}
                    center={[s.ultima_ubicacion!.lat, s.ultima_ubicacion!.lng]}
                    radius={9}
                    pathOptions={{
                      color: '#fff',
                      fillColor: reponedorElegido === s.id ? BRAND.amber : BRAND.secondary,
                      fillOpacity: 1,
                      weight: 2,
                    }}
                  >
                    <Popup>
                      <strong>{s.nombre}</strong>
                      <br />
                      {s.distancia_media_km != null && `${s.distancia_media_km} km promedio`}
                    </Popup>
                  </CircleMarker>
                ))}
            </MapContainer>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-100">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h3 className="font-bold text-gray-700 text-sm flex items-center gap-2">
                <User className="w-4 h-4 text-venaris-primary" /> Reponedores
              </h3>
              <button
                onClick={handleSugerir}
                disabled={loadingSugerencia}
                className="flex items-center gap-1.5 bg-amber-400 hover:bg-amber-500 text-[#001228] text-xs font-bold px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {loadingSugerencia ? 'Calculando...' : 'Sugerir por proximidad'}
              </button>
            </div>
            <div className="max-h-[180px] overflow-y-auto p-3 space-y-2">
              {sugerencias.length === 0 && (
                <p className="text-center py-6 text-gray-400 text-xs">
                  Selecciona locales y pulsa "Sugerir por proximidad" para ordenar a los reponedores
                  por cercanía.
                </p>
              )}
              {sugerencias.map((s, i) => (
                <button
                  key={s.id}
                  onClick={() => setReponedorElegido(s.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-lg border text-left transition-all ${
                    reponedorElegido === s.id
                      ? 'border-amber-400 bg-amber-50'
                      : 'border-gray-200 hover:border-venaris-primary/40'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {i === 0 && s.tiene_ubicacion && (
                      <span className="text-[10px] font-bold bg-amber-400 text-[#001228] px-1.5 py-0.5 rounded">
                        + CERCANO
                      </span>
                    )}
                    <div>
                      <p className="font-semibold text-sm text-gray-900">{s.nombre}</p>
                      <p className="text-xs text-gray-400">{s.pdvs_hoy} PDVs hoy</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {s.distancia_media_km != null ? (
                      <span className="text-sm font-bold text-venaris-primary">
                        {s.distancia_media_km} km
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">Sin ubicación</span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={handleAsignar}
            disabled={creando || !reponedorElegido || seleccionados.size === 0}
            className="w-full flex items-center justify-center gap-2 bg-venaris-primary hover:bg-venaris-primary-light text-white text-sm font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RouteIcon className="w-4 h-4" />
            {creando ? 'Asignando...' : 'Asignar Ruta'}
          </button>
        </div>
      </div>
    </div>
  );
};
