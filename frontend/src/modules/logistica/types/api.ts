export type RouteStatus = 'pending' | 'in_progress' | 'completed' | 'partial';

export interface RutaSupervisor {
  reponedor?: string;
  route_id?: string;
  status?: RouteStatus;
  total_pdvs: number;
  completados?: number;
  pendientes?: number;
  omitidos?: number;
  pct_completitud?: number;
  total_estimado_min?: number;
  total_real_min?: number | null;
}

export interface DashboardSupervisorResponse {
  fecha: string;
  rutas: RutaSupervisor[];
}

export interface PDVResumen {
  id: string;
  code: string;
  lat: number;
  lng: number;
  market_name?: string;
  visit_minutes_estimated?: number;
}

export interface RouteStopResumen {
  id: string;
  stop_order: number;
  status: RouteStatus;
  estimated_minutes: number;
  distance_from_prev_km: string;
  arrived_at?: string | null;
  finished_at?: string | null;
  pdv: PDVResumen;
}

export interface TrafficLeg {
  distancia: string;
  tiempo_trafico: string;
  demora_s: number;
}

export interface TrafficInfo {
  via_principal: string;
  distancia_total: string;
  tiempo_estimado_min: number;
  tiempo_con_trafico_min: number;
  demora_trafico_min: number;
  advertencias: string[];
  polyline: string;
  tramos: TrafficLeg[];
}

export interface RutaHoy {
  id: string;
  status: RouteStatus;
  route_date: string;
  total_pdvs: number;
  total_estimated_minutes: number;
  total_distance_km: string;
  started_at?: string | null;
  stops: RouteStopResumen[];
  traffic_info?: TrafficInfo | null;
}

// ── Registro y Asignación ──────────────────────────────────────────────────

export interface Coordenada {
  lat: number;
  lng: number;
}

export interface ReponedorAPI {
  id: number;
  username: string;
  nombre_completo: string;
  rol: string;
  is_active: boolean;
  pdvs_hoy: number;
  ultima_ubicacion: Coordenada | null;
}

export interface CrearReponedorPayload {
  username: string;
  password: string;
  nombre?: string;
  is_active?: boolean;
}

export type CategoriaCliente = 'MAYORISTA' | 'MINORISTA' | 'DETALLISTA';

export interface MarketAPI {
  id: string;
  name: string;
  zone: string | null;
  city: string;
}

export interface ClientTypeAPI {
  id: string;
  category: CategoriaCliente;
  avg_visit_minutes: number;
}

export interface PDVListItem {
  id: string;
  code: string;
  client_code: string;
  market_name: string;
  categoria: CategoriaCliente;
  lat: number;
  lng: number;
  visit_minutes_estimated: number;
  is_active: boolean;
}

export interface PDVCreatePayload {
  code: string;
  client_code: string;
  market: string;
  client_type: string;
  latitud: number;
  longitud: number;
  visit_minutes_estimated: number;
  visit_mon: boolean;
  visit_tue: boolean;
  visit_wed: boolean;
  visit_thu: boolean;
  visit_fri: boolean;
  visit_sat: boolean;
  notes?: string;
}

export interface SugerenciaReponedor {
  id: number;
  username: string;
  nombre: string;
  pdvs_hoy: number;
  distancia_media_km: number | null;
  tiene_ubicacion: boolean;
  ultima_ubicacion: Coordenada | null;
}
