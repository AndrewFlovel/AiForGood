// src/hooks/useRegistroEventos.js
// Registro asíncrono por pregunta: timestamp exacto de cada respuesta,
// geoposición, entidad (PDV) y último chequeo (check-in de la parada).
// Nunca bloquea la UI: todo va sobre refs y escrituras fire-and-forget.
// El borrador se persiste en AsyncStorage por parada (crash-safe) y se
// convierte en un lote de eventos al enviar la tarea.

import { useEffect, useRef, useState } from 'react';

import { generarUUID } from '../utils/uuid';
import { getMapLocation } from './useSecureLocation';
import { guardarBorradorEventos, leerBorradorEventos } from '../services/outbox';

// text/number disparan onChangeText por tecla: se registra el valor
// "asentado" tras una pausa, no cada pulsación.
const DEBOUNCE_TEXTO_MS = 800;

export function useRegistroEventos(stop) {
  const eventosRef = useRef({});    // { [pregunta_key]: evento }
  const timersRef = useRef({});     // { [pregunta_key]: timeoutId }
  const pendientesRef = useRef({}); // { [pregunta_key]: { campo, valor } } (debounce en vuelo)
  const ubicacionRef = useRef(null);
  const [datosIniciales, setDatosIniciales] = useState(null);

  const entidadNombre = `${stop.pdv.market_name} (PDV ${stop.pdv.code})`;

  useEffect(() => {
    let mounted = true;

    // Geoposición barata UNA vez al montar (Balanced, sin anti-spoofing):
    // cada evento toma un snapshot de esta ref. Cero llamadas GPS por respuesta.
    getMapLocation()
      .then((loc) => {
        ubicacionRef.current = loc;
      })
      .catch(() => {});

    // Rehidratar borrador si la app murió a mitad del formulario
    leerBorradorEventos(stop.id).then((borrador) => {
      if (!mounted || !borrador) return;
      eventosRef.current = borrador;
      const datos = {};
      for (const [key, ev] of Object.entries(borrador)) {
        if (key !== 'foto_evidencia' && key !== 'notas') {
          datos[key] = ev.valorCrudo ?? ev.valor;
        }
      }
      setDatosIniciales(datos);
    });

    return () => {
      mounted = false;
      Object.values(timersRef.current).forEach(clearTimeout);
    };
  }, [stop.id]);

  function commit(campo, valor) {
    const existente = eventosRef.current[campo.key];
    eventosRef.current[campo.key] = {
      // El id se genera UNA vez por pregunta y se reutiliza en ediciones:
      // en el servidor el último reenvío del mismo id cuenta como duplicado.
      id: existente?.id || generarUUID(),
      route_stop: stop.id,
      pregunta_key: campo.key,
      pregunta_descripcion: campo.label,
      valor: valor == null ? null : String(valor),
      valorCrudo: valor, // solo para rehidratar el borrador; se quita al encolar
      answered_at: new Date().toISOString(),
      latitud: ubicacionRef.current?.latitude ?? null,
      longitud: ubicacionRef.current?.longitude ?? null,
      foto_local: existente?.foto_local ?? null,
      entidad_nombre: entidadNombre,
      ultimo_chequeo: stop.arrived_at ?? null,
    };
    guardarBorradorEventos(stop.id, eventosRef.current); // fire-and-forget
  }

  function registrarRespuesta(campo, valor) {
    if (campo.type === 'text' || campo.type === 'number') {
      pendientesRef.current[campo.key] = { campo, valor };
      clearTimeout(timersRef.current[campo.key]);
      timersRef.current[campo.key] = setTimeout(() => {
        const p = pendientesRef.current[campo.key];
        if (p) {
          commit(p.campo, p.valor);
          delete pendientesRef.current[campo.key];
        }
      }, DEBOUNCE_TEXTO_MS);
    } else {
      // select / boolean: un tap = una respuesta, commit inmediato
      commit(campo, valor);
    }
  }

  function registrarFoto(uri, timestampISO) {
    const key = 'foto_evidencia';
    const existente = eventosRef.current[key];
    eventosRef.current[key] = {
      id: existente?.id || generarUUID(),
      route_stop: stop.id,
      pregunta_key: key,
      pregunta_descripcion: 'Comprobante visual (cámara)',
      valor: 'foto capturada',
      answered_at: timestampISO || new Date().toISOString(),
      latitud: ubicacionRef.current?.latitude ?? null,
      longitud: ubicacionRef.current?.longitude ?? null,
      foto_local: uri,
      entidad_nombre: entidadNombre,
      ultimo_chequeo: stop.arrived_at ?? null,
    };
    guardarBorradorEventos(stop.id, eventosRef.current);
  }

  // Flush de debounces en vuelo + snapshot final listo para encolar
  function finalizarEventos() {
    Object.values(timersRef.current).forEach(clearTimeout);
    timersRef.current = {};
    Object.values(pendientesRef.current).forEach(({ campo, valor }) => commit(campo, valor));
    pendientesRef.current = {};
    return Object.values(eventosRef.current).map(({ valorCrudo, ...evento }) => evento);
  }

  return { registrarRespuesta, registrarFoto, finalizarEventos, datosIniciales };
}
