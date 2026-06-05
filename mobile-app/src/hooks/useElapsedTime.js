// src/hooks/useElapsedTime.js
// Cronómetro en vivo de la sesión de trabajo a partir del timestamp de login.
// Devuelve un string legible: "MM:SS" si < 1h, o "Hh MMm" si >= 1h.

import { useEffect, useState } from 'react';

export function useElapsedTime(loginTimestamp) {
  const [label, setLabel] = useState('--');

  useEffect(() => {
    if (!loginTimestamp) {
      setLabel('--');
      return;
    }

    const start = new Date(loginTimestamp).getTime();
    if (Number.isNaN(start)) {
      setLabel('--');
      return;
    }

    function tick() {
      const diff = Math.max(0, Date.now() - start);
      const totalSec = Math.floor(diff / 1000);
      const h = Math.floor(totalSec / 3600);
      const m = Math.floor((totalSec % 3600) / 60);
      const s = totalSec % 60;

      if (h >= 1) {
        setLabel(`${h}h ${String(m).padStart(2, '0')}m`);
      } else {
        setLabel(`${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`);
      }
    }

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [loginTimestamp]);

  return label;
}
