import Constants from 'expo-constants';

// ─────────────────────────────────────────────────────────────────────────────
// ACCESO DESDE CUALQUIER RED (datos móviles u otra WiFi):
// Pega aquí la URL pública del túnel que expone el backend (puerto 8001).
//   Ej: 'https://abc-123.trycloudflare.com'   (cloudflared)
//       'https://xxxx.ngrok-free.app'         (ngrok)
// Déjala vacía ('') para usar la red local (misma WiFi).
// ─────────────────────────────────────────────────────────────────────────────
const TUNNEL_URL = '';

// IP LAN de la máquina de desarrollo (Django corre en :8001).
// Usada solo cuando NO hay túnel y el teléfono está en la misma WiFi.
const LAN_IP = '192.168.1.104';

function resolverBackend() {
  // 1. Si hay túnel configurado, tiene prioridad (funciona desde cualquier red).
  if (TUNNEL_URL) return TUNNEL_URL.replace(/\/$/, '');

  // 2. Red local: host que Expo expone en desarrollo.
  //    - Modo LAN   -> IP local (ej. 192.168.88.12) -> sirve para el backend.
  //    - Modo túnel -> dominio ngrok de Expo (exp.direct) -> NO llega al backend,
  //      así que forzamos la IP LAN.
  const debuggerHost = Constants.expoConfig?.hostUri?.split(':')[0];
  const esTunnelExpo = !!debuggerHost && /exp\.(direct|host)$/.test(debuggerHost);
  const backendHost = (!debuggerHost || esTunnelExpo) ? LAN_IP : debuggerHost;
  return `http://${backendHost}:8001`;
}

export const BACKEND_URL = resolverBackend();

export const GOOGLE_MAPS_API_KEY = 'AIzaSyDvr5Fvy766IyGV4a8fvTp9QS3QCjFqhkk';
