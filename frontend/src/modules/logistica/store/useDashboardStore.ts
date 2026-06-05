import { create } from 'zustand';
import type { DashboardSupervisorResponse } from '../types/api';
import { useAuthStore } from '../../auth/store/useAuthStore';

export interface Sucursal {
  id: string;
  nombre: string;
  lat: number;
  lng: number;
  zona: string;
  metaAlcanzada: boolean;
  fallaPrincipal: 'Logística' | 'Comercial' | null;
  ventasHistoricas: { mes: string; ventas: number }[];
  reporteReponedor: { limpio: boolean; abastecido: boolean; observaciones: string; actitudEncargado?: string };
  cumplimientoRuta: { aTiempo: boolean; desvioMts: number; descargaCompleta: boolean };
  tiemposRuta: { tramo: string; planificado: number; real: number }[];
}

export const mockSucursales: Sucursal[] = [
  {
    id: '1',
    nombre: 'Supermercado Ketal Megacenter',
    zona: 'Irpavi',
    lat: -16.5367,
    lng: -68.0924,
    metaAlcanzada: true,
    fallaPrincipal: null,
    ventasHistoricas: [{ mes: 'Ene', ventas: 400 }, { mes: 'Feb', ventas: 450 }, { mes: 'Mar', ventas: 500 }],
    reporteReponedor: { limpio: true, abastecido: true, observaciones: 'Sin novedades' },
    cumplimientoRuta: { aTiempo: true, desvioMts: 0, descargaCompleta: true },
    tiemposRuta: [
      { tramo: 'Llegada', planificado: 30, real: 32 },
      { tramo: 'Descarga', planificado: 45, real: 40 }
    ]
  },
  {
    id: '2',
    nombre: 'Mercado Camacho (Falla Logística)',
    zona: 'Centro',
    lat: -16.4996,
    lng: -68.1350,
    metaAlcanzada: false,
    fallaPrincipal: 'Logística',
    ventasHistoricas: [{ mes: 'Ene', ventas: 300 }, { mes: 'Feb', ventas: 280 }, { mes: 'Mar', ventas: 210 }],
    reporteReponedor: { limpio: true, abastecido: false, observaciones: 'Góndola vacía por la mañana. Tráfico excesivo en el centro.' },
    cumplimientoRuta: { aTiempo: false, desvioMts: 150, descargaCompleta: false },
    tiemposRuta: [
      { tramo: 'Llegada', planificado: 40, real: 120 },
      { tramo: 'Descarga', planificado: 45, real: 20 }
    ]
  },
  {
    id: '3',
    nombre: 'Hipermaxi Los Pinos (Falla Comercial)',
    zona: 'Zona Sur',
    lat: -16.5412,
    lng: -68.0775,
    metaAlcanzada: false,
    fallaPrincipal: 'Comercial',
    ventasHistoricas: [{ mes: 'Ene', ventas: 500 }, { mes: 'Feb', ventas: 450 }, { mes: 'Mar', ventas: 300 }],
    reporteReponedor: { limpio: true, abastecido: true, observaciones: 'El encargado movió los productos a la parte inferior. Competencia pagó cabecera.', actitudEncargado: 'Desplazamiento de marca' },
    cumplimientoRuta: { aTiempo: true, desvioMts: 5, descargaCompleta: true },
    tiemposRuta: [
      { tramo: 'Llegada', planificado: 25, real: 24 },
      { tramo: 'Descarga', planificado: 30, real: 35 }
    ]
  },
  {
    id: '4',
    nombre: 'Agencia El Alto - Ceja',
    zona: 'El Alto',
    lat: -16.5050,
    lng: -68.1630,
    metaAlcanzada: true,
    fallaPrincipal: null,
    ventasHistoricas: [{ mes: 'Ene', ventas: 420 }, { mes: 'Feb', ventas: 460 }, { mes: 'Mar', ventas: 490 }],
    reporteReponedor: { limpio: true, abastecido: true, observaciones: 'Descarga fluida' },
    cumplimientoRuta: { aTiempo: true, desvioMts: 10, descargaCompleta: true },
    tiemposRuta: [
      { tramo: 'Llegada', planificado: 50, real: 48 },
      { tramo: 'Descarga', planificado: 40, real: 38 }
    ]
  }
];

export const mockSpaceShareData = [
  { nombre: 'Ketal', venado: 60, competencia: 40 },
  { nombre: 'Camacho', venado: 35, competencia: 65 },
  { nombre: 'Los Pinos', venado: 40, competencia: 60 },
  { nombre: 'El Alto', venado: 55, competencia: 45 },
];

export const mockSpaceShareGlobal = [
  { name: 'Venaris', value: 47, fill: '#001E40' },
  { name: 'Competencia Principal', value: 38, fill: '#D1D5DB' },
  { name: 'Otros', value: 15, fill: '#9CA3AF' }
];

interface DashboardStore {
  sucursalSeleccionada: Sucursal | null;
  setSucursalSeleccionada: (sucursal: Sucursal | null) => void;
  sucursales: Sucursal[];
}

export const useDashboardStore = create<DashboardStore>((set) => ({
  sucursalSeleccionada: null,
  setSucursalSeleccionada: (sucursal) => set({ sucursalSeleccionada: sucursal }),
  sucursales: mockSucursales,
}));

// ── Store de supervisor (datos reales desde la API Django) ─────────────────────

interface SupervisorState {
  supervisorData: DashboardSupervisorResponse | null;
  supervisorLoading: boolean;
  supervisorError: string | null;
  fetchSupervisorDashboard: () => Promise<void>;
}

export const useSupervisorStore = create<SupervisorState>((set) => ({
  supervisorData: null,
  supervisorLoading: false,
  supervisorError: null,

  fetchSupervisorDashboard: async () => {
    set({ supervisorLoading: true, supervisorError: null });
    const { getAuthHeaders, logout } = useAuthStore.getState();
    try {
      const res = await fetch('/api/logistica/supervisor/dashboard/', {
        headers: getAuthHeaders(),
      });
      if (res.status === 401) {
        logout();
        return;
      }
      if (!res.ok) {
        set({ supervisorError: `Error ${res.status} al cargar el dashboard` });
        return;
      }
      set({ supervisorData: await res.json() });
    } catch (e) {
      set({
        supervisorError: e instanceof Error ? e.message : 'Sin conexión al servidor',
      });
    } finally {
      set({ supervisorLoading: false });
    }
  },
}));
