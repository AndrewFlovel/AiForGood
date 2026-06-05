// src/hooks/useConnectivity.js
// Estado de conectividad de red vía expo-network (SDK 56).
// API: Network.getNetworkStateAsync() + Network.addNetworkStateListener().
// Defensivo: si el módulo nativo no está en el build, asume "en línea"
// para no bloquear el flujo de trabajo del reponedor.

import { useEffect, useState } from 'react';
import * as Network from 'expo-network';

// "En línea" salvo que la red reporte explícitamente desconexión.
function esEnLinea(state) {
  if (!state) return true;
  return state.isConnected !== false && state.isInternetReachable !== false;
}

export function useConnectivity() {
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    let mounted = true;
    let subscription;
    let pollId;

    function aplicar(state) {
      if (mounted) setIsOnline(esEnLinea(state));
    }

    async function start() {
      try {
        aplicar(await Network.getNetworkStateAsync());

        if (typeof Network.addNetworkStateListener === 'function') {
          subscription = Network.addNetworkStateListener(aplicar);
        } else {
          // Fallback: poll cada 10s si no hay listener disponible.
          pollId = setInterval(async () => {
            try {
              aplicar(await Network.getNetworkStateAsync());
            } catch {
              /* ignora errores transitorios de red */
            }
          }, 10000);
        }
      } catch {
        // Módulo nativo ausente (build viejo / Expo Go) → asumir en línea.
        if (mounted) setIsOnline(true);
      }
    }

    start();

    return () => {
      mounted = false;
      subscription?.remove?.();
      if (pollId) clearInterval(pollId);
    };
  }, []);

  return { isOnline };
}
