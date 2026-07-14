// src/services/fotosOutbox.js
// Persistencia de fotos para la cola offline. La cámara deja el archivo en
// el cache dir (el OS puede purgarlo en cualquier momento); lo copiamos a
// documents hasta que la tarea sincronice, y recién ahí se borra.
// API nueva de expo-file-system (SDK 56): File / Directory / Paths.

import { File, Directory, Paths } from 'expo-file-system';

const CARPETA_OUTBOX = 'outbox_fotos';

export async function persistirFoto(uri, stopId) {
  const dir = new Directory(Paths.document, CARPETA_OUTBOX);
  dir.create({ intermediates: true, idempotent: true });
  const destino = new File(dir, `tarea-${stopId}-${Date.now()}.jpg`);
  await new File(uri).copy(destino);
  return destino.uri;
}

export function borrarFotoPersistida(uri) {
  if (!uri) return;
  try {
    new File(uri).delete();
  } catch {
    // best-effort: un huérfano en documents no rompe nada
  }
}
