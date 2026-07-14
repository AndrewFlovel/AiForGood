// src/services/outbox.js
// Cola offline (patrón outbox) respaldada en AsyncStorage.
// Nunca guarda bytes de foto: solo paths y JSON pequeño (límite ~6MB Android).
// logout() NO toca estas keys: la cola sobrevive al cierre de sesión y se
// retoma tras el próximo login.

import AsyncStorage from '@react-native-async-storage/async-storage';
import { generarUUID } from '../utils/uuid';

const OUTBOX_KEY = '@venado_outbox';
const ERRORES_KEY = '@venado_outbox_errores';
const BORRADOR_PREFIX = '@venado_eventos_borrador:';

// Item: { id, type: 'tarea' | 'eventos', payload, createdAt, retryCount }
// payload tarea:   { stopId, fotoPath, notas, datosExtra, fotoTimestamp,
//                    sesionIniciadaAt, clientSubmissionId }
// payload eventos: [ { id, route_stop, pregunta_key, pregunta_descripcion,
//                      valor, answered_at, latitud, longitud, foto_local,
//                      entidad_nombre, ultimo_chequeo }, ... ]

const listeners = new Set();

function notificar() {
  listeners.forEach((l) => {
    try {
      l();
    } catch {
      /* un listener roto no debe tumbar al resto */
    }
  });
}

export function suscribir(listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

async function leerLista(key) {
  try {
    const raw = await AsyncStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export async function listar() {
  return leerLista(OUTBOX_KEY);
}

export async function contar() {
  return (await listar()).length;
}

export async function encolar(type, payload) {
  const item = {
    id: generarUUID(),
    type,
    payload,
    createdAt: new Date().toISOString(),
    retryCount: 0,
  };
  const items = await listar();
  items.push(item);
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
  notificar();
  return item;
}

export async function eliminar(id) {
  const items = await listar();
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(items.filter((i) => i.id !== id)));
  notificar();
}

export async function incrementarRetry(id) {
  const items = await listar();
  const item = items.find((i) => i.id === id);
  if (!item) return;
  item.retryCount = (item.retryCount || 0) + 1;
  await AsyncStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
}

// Dead-letter: errores 4xx permanentes quedan aquí solo para inspección,
// no se reintentan (evita que un item envenenado bloquee la cola).
export async function moverAErrores(item, motivo) {
  const errores = await leerLista(ERRORES_KEY);
  errores.push({ ...item, motivo, movedAt: new Date().toISOString() });
  await AsyncStorage.setItem(ERRORES_KEY, JSON.stringify(errores));
  await eliminar(item.id);
}

// Ids de paradas con tarea encolada (HomeScreen las marca como pendientes
// de sincronizar para evitar llenar el formulario dos veces).
export async function stopsConTareaPendiente() {
  return (await listar())
    .filter((i) => i.type === 'tarea')
    .map((i) => i.payload.stopId);
}

// ---- Borradores crash-safe de eventos por parada ----
// Se persisten mientras el reponedor responde; se limpian al encolar.

export async function guardarBorradorEventos(stopId, eventosPorKey) {
  try {
    await AsyncStorage.setItem(BORRADOR_PREFIX + stopId, JSON.stringify(eventosPorKey));
  } catch {
    /* fire-and-forget: no bloquear la UI por un fallo de storage */
  }
}

export async function leerBorradorEventos(stopId) {
  try {
    const raw = await AsyncStorage.getItem(BORRADOR_PREFIX + stopId);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export async function limpiarBorradorEventos(stopId) {
  try {
    await AsyncStorage.removeItem(BORRADOR_PREFIX + stopId);
  } catch {
    /* idem */
  }
}
