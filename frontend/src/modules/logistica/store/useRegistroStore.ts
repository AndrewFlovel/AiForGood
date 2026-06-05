import { create } from 'zustand';
import { useAuthStore } from '../../auth/store/useAuthStore';
import type {
  ReponedorAPI,
  CrearReponedorPayload,
  MarketAPI,
  ClientTypeAPI,
  PDVListItem,
  PDVCreatePayload,
  SugerenciaReponedor,
} from '../types/api';

const BASE = '/api/logistica';

async function apiFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const { getAuthHeaders, logout } = useAuthStore.getState();
  const res = await fetch(url, { ...init, headers: getAuthHeaders() });
  if (res.status === 401) {
    logout();
    throw new Error('Sesión expirada');
  }
  if (!res.ok) {
    let detail = `Error ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail || body.mensaje || JSON.stringify(body);
    } catch {
      /* sin cuerpo JSON */
    }
    throw new Error(detail);
  }
  return res.json();
}

interface RegistroState {
  // Reponedores
  reponedores: ReponedorAPI[];
  loadingReponedores: boolean;
  errorReponedores: string | null;
  fetchReponedores: () => Promise<void>;
  crearReponedor: (payload: CrearReponedorPayload) => Promise<void>;

  // Catálogos
  markets: MarketAPI[];
  clientTypes: ClientTypeAPI[];
  fetchCatalogos: () => Promise<void>;

  // PDVs
  pdvs: PDVListItem[];
  loadingPdvs: boolean;
  errorPdvs: string | null;
  fetchPdvs: () => Promise<void>;
  crearPdv: (payload: PDVCreatePayload) => Promise<void>;

  // Asignación
  pdvsDisponibles: PDVListItem[];
  fetchPdvsDisponibles: (fecha: string) => Promise<void>;
  sugerencias: SugerenciaReponedor[];
  loadingSugerencia: boolean;
  sugerirReponedor: (pdvIds: string[]) => Promise<void>;
  crearRuta: (reponedorId: number, pdvIds: string[], fecha: string) => Promise<string>;
}

export const useRegistroStore = create<RegistroState>((set, get) => ({
  reponedores: [],
  loadingReponedores: false,
  errorReponedores: null,
  fetchReponedores: async () => {
    set({ loadingReponedores: true, errorReponedores: null });
    try {
      const data = await apiFetch<ReponedorAPI[]>(`${BASE}/supervisor/reponedores/`);
      set({ reponedores: data });
    } catch (e) {
      set({ errorReponedores: e instanceof Error ? e.message : 'Error al cargar' });
    } finally {
      set({ loadingReponedores: false });
    }
  },
  crearReponedor: async (payload) => {
    await apiFetch(`${BASE}/supervisor/reponedores/crear/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await get().fetchReponedores();
  },

  markets: [],
  clientTypes: [],
  fetchCatalogos: async () => {
    const [markets, clientTypes] = await Promise.all([
      apiFetch<MarketAPI[]>(`${BASE}/markets/`),
      apiFetch<ClientTypeAPI[]>(`${BASE}/tipos-cliente/`),
    ]);
    set({ markets, clientTypes });
  },

  pdvs: [],
  loadingPdvs: false,
  errorPdvs: null,
  fetchPdvs: async () => {
    set({ loadingPdvs: true, errorPdvs: null });
    try {
      const data = await apiFetch<PDVListItem[]>(`${BASE}/pdvs/`);
      set({ pdvs: data });
    } catch (e) {
      set({ errorPdvs: e instanceof Error ? e.message : 'Error al cargar' });
    } finally {
      set({ loadingPdvs: false });
    }
  },
  crearPdv: async (payload) => {
    await apiFetch(`${BASE}/pdvs/`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    await get().fetchPdvs();
  },

  pdvsDisponibles: [],
  fetchPdvsDisponibles: async (fecha) => {
    const data = await apiFetch<PDVListItem[]>(
      `${BASE}/supervisor/pdvs-disponibles/?fecha=${fecha}`
    );
    set({ pdvsDisponibles: data });
  },

  sugerencias: [],
  loadingSugerencia: false,
  sugerirReponedor: async (pdvIds) => {
    set({ loadingSugerencia: true });
    try {
      const data = await apiFetch<{ sugerencias: SugerenciaReponedor[] }>(
        `${BASE}/supervisor/sugerir-reponedor/`,
        { method: 'POST', body: JSON.stringify({ pdv_ids: pdvIds }) }
      );
      set({ sugerencias: data.sugerencias });
    } finally {
      set({ loadingSugerencia: false });
    }
  },

  crearRuta: async (reponedorId, pdvIds, fecha) => {
    const data = await apiFetch<{ route_id: string }>(
      `${BASE}/supervisor/crear-ruta/`,
      {
        method: 'POST',
        body: JSON.stringify({ reponedor_id: reponedorId, pdv_ids: pdvIds, fecha }),
      }
    );
    return data.route_id;
  },
}));
