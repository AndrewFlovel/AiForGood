// src/services/sincronizador.js
// Motor de sincronización del outbox. A propósito NO usa useApi: su manejo
// de 401 (logout inmediato) mataría la sesión a mitad de cola. Aquí un 401
// intenta UN refresh de token y, si falla, pausa la cola sin desloguear ni
// descartar nada; se reintenta en el próximo trigger o tras re-login.

import { BACKEND_URL } from '../constants/api';
import { listar, eliminar, incrementarRetry, moverAErrores } from './outbox';
import { borrarFotoPersistida } from './fotosOutbox';

let enProceso = false;

// 4xx definitivos: reintentarlos jamás va a funcionar → dead-letter.
// 401 (token), 408 (timeout) y 429 (rate limit) sí son recuperables.
function esErrorPermanente(status) {
  return status >= 400 && status < 500 && ![401, 408, 429].includes(status);
}

function headersBase(ctx, esFormData) {
  return {
    ...(esFormData ? {} : { 'Content-Type': 'application/json' }),
    Authorization: `Bearer ${ctx.token}`,
    'X-Device-ID': ctx.deviceId,
  };
}

function enviarItem(item, ctx) {
  if (item.type === 'eventos') {
    return fetch(`${BACKEND_URL}/api/logistica/eventos-respuesta/`, {
      method: 'POST',
      headers: headersBase(ctx, false),
      body: JSON.stringify({ eventos: item.payload }),
    });
  }

  // type === 'tarea': reconstruir el multipart desde el payload persistido
  const p = item.payload;
  const formData = new FormData();
  formData.append('foto', {
    uri: p.fotoPath,
    type: 'image/jpeg',
    name: `tarea-${p.stopId}-${Date.now()}.jpg`,
  });
  formData.append('notas', p.notas || '');
  formData.append('datos_extra', JSON.stringify(p.datosExtra || {}));
  if (p.fotoTimestamp) formData.append('foto_timestamp', p.fotoTimestamp);
  if (p.sesionIniciadaAt) formData.append('sesion_iniciada_at', p.sesionIniciadaAt);
  if (p.clientSubmissionId) formData.append('client_submission_id', p.clientSubmissionId);

  return fetch(`${BACKEND_URL}/api/logistica/paradas/${p.stopId}/tarea/`, {
    method: 'POST',
    headers: headersBase(ctx, true),
    body: formData,
  });
}

async function refrescarToken(ctx) {
  if (!ctx.refreshToken) return null;
  try {
    const res = await fetch(`${BACKEND_URL}/api/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh: ctx.refreshToken }),
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.access || null;
  } catch {
    return null;
  }
}

// Procesa la cola FIFO. ctx: { token, deviceId, refreshToken, onTokenRefrescado }.
// Devuelve true si la cola quedó vacía.
export async function procesarOutbox(ctx) {
  if (enProceso) return false;
  enProceso = true;
  try {
    const items = await listar();
    for (const item of items) {
      let res;
      try {
        res = await enviarItem(item, ctx);
      } catch {
        return false; // error de red → retener todo, reintentar en el próximo trigger
      }

      if (res.status === 401) {
        const nuevoAccess = await refrescarToken(ctx);
        if (!nuevoAccess) return false; // cola intacta, SIN logout
        ctx.token = nuevoAccess;
        ctx.onTokenRefrescado?.(nuevoAccess);
        try {
          res = await enviarItem(item, ctx);
        } catch {
          return false;
        }
        if (res.status === 401) return false;
      }

      if (res.ok) {
        // Cualquier 2xx cuenta (incluye el 200 "duplicado" de reenvíos)
        if (item.type === 'tarea') borrarFotoPersistida(item.payload.fotoPath);
        await eliminar(item.id);
      } else if (esErrorPermanente(res.status)) {
        console.warn(`[outbox] item ${item.id} (${item.type}) descartado: HTTP ${res.status}`);
        await moverAErrores(item, `HTTP ${res.status}`);
      } else {
        // 5xx / 408 / 429 → transitorio: abortar la corrida y reintentar luego
        await incrementarRetry(item.id);
        return false;
      }
    }
    return (await listar()).length === 0;
  } finally {
    enProceso = false;
  }
}
