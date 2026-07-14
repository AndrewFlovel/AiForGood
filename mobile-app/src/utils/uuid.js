// Generador UUID v4 con fuente criptográficamente segura (expo-crypto).
// Usado por: outbox (id de item), eventos de respuesta (id idempotente),
// client_submission_id de la tarea y device_id de AuthContext — estos ids
// viajan al servidor como claves de idempotencia, no deben ser predecibles.
import * as Crypto from 'expo-crypto';

export function generarUUID() {
  try {
    return Crypto.randomUUID();
  } catch {
    // Fallback si el módulo nativo no está en el build (dev client viejo):
    // Math.random NO es criptográficamente seguro, solo evita romper el flujo.
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
      const r = (Math.random() * 16) | 0;
      return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
  }
}
