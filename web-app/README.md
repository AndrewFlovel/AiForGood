# ⚠️ PROYECTO ARCHIVADO — web-app/

Este directorio fue el primer prototipo de la interfaz web de **Venaris Route AI**.

**El proyecto activo es [`/frontend/`](../frontend/)** — versión con TypeScript, Tailwind CSS 4, React Router 7, Zustand, Leaflet y Recharts.

## Por qué se archivó

- Solo tenía 2 componentes (Login + Dashboard tabla básica)
- Sin sistema de rutas (React Router)
- Sin UI rica (no había mapa interactivo, paneles analíticos ni gráficas)

## Qué se migró a /frontend/

- Conexión real a `GET /api/logistica/supervisor/dashboard/`
- `StatusBadge` con colores por estado (`pending`, `in_progress`, `completed`, `partial`)
- Paleta de colores de marca (`#001E40` primario, `#1B6D24` secundario)
- Logo y wordmark "INDUSTRIAS VENARIS"
- `useAuthStore` con `username`, `deviceId` y `getAuthHeaders()`

## Cómo correr el proyecto activo

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```
