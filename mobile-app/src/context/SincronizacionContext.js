// src/context/SincronizacionContext.js
// Estado global de sincronización offline. Montado en el área autenticada:
// dispara el procesamiento del outbox al arrancar/loguear, al recuperar
// conexión, y bajo demanda (sincronizarAhora tras encolar).

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import { useAuth } from './AuthContext';
import { useConnectivity } from '../hooks/useConnectivity';
import { contar, stopsConTareaPendiente, suscribir } from '../services/outbox';
import { procesarOutbox } from '../services/sincronizador';

const SincronizacionContext = createContext(null);

export function SincronizacionProvider({ children }) {
  const { token, deviceId, refreshToken, actualizarToken } = useAuth();
  const { isOnline } = useConnectivity();

  const [pendientes, setPendientes] = useState(0);
  const [stopsPendientes, setStopsPendientes] = useState([]);
  const [sincronizando, setSincronizando] = useState(false);

  // Ref para que sincronizarAhora sea estable y siempre use el auth vigente
  const authRef = useRef({});
  authRef.current = { token, deviceId, refreshToken, actualizarToken };

  const refrescarEstado = useCallback(async () => {
    setPendientes(await contar());
    setStopsPendientes(await stopsConTareaPendiente());
  }, []);

  const sincronizarAhora = useCallback(async () => {
    const auth = authRef.current;
    if (!auth.token) return;
    setSincronizando(true);
    try {
      await procesarOutbox({
        token: auth.token,
        deviceId: auth.deviceId,
        refreshToken: auth.refreshToken,
        onTokenRefrescado: auth.actualizarToken,
      });
    } finally {
      setSincronizando(false);
      refrescarEstado();
    }
  }, [refrescarEstado]);

  // Estado inicial + reaccionar a cambios del outbox (encolar/eliminar)
  useEffect(() => {
    refrescarEstado();
    return suscribir(refrescarEstado);
  }, [refrescarEstado]);

  // Triggers: montaje (login/arranque, isOnline inicia true) y cada
  // transición offline → online.
  useEffect(() => {
    if (isOnline) sincronizarAhora();
  }, [isOnline, sincronizarAhora]);

  return (
    <SincronizacionContext.Provider
      value={{ pendientes, sincronizando, stopsPendientes, sincronizarAhora }}
    >
      {children}
    </SincronizacionContext.Provider>
  );
}

export function useSincronizacion() {
  return useContext(SincronizacionContext);
}
