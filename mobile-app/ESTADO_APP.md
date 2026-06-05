# Estado de la App Móvil — Venado Logística

> Última actualización: 2026-05-31
> Stack: Expo SDK 56 · React Native · @react-navigation/native-stack · dev build (NO Expo Go)

---

## 1. Resumen de lo realizado en esta sesión

Se completaron **dos bloques de trabajo**:

1. **Feature "Tarea en Proceso"** — formulario obligatorio que el reponedor llena durante
   la visita y que, al enviarse, registra la evidencia y **completa la parada** en una sola
   transacción (foto a Google Drive + notas + datos adicionales + timestamps).
2. **Rediseño visual (skill `react-native-styling`)** — sistema de diseño centralizado,
   componentes reutilizables y refactor de todas las pantallas sin perder funcionalidad.

---

## 2. Feature "Tarea en Proceso"

### Flujo
`Check-in GPS` → parada `in_progress` → botón **"REGISTRAR Y COMPLETAR"** → pantalla
`TareaEnProceso` → enviar → backend sube foto a Drive + completa la parada → vuelve a Home.

### Captura de evidencia (anti-fraude)
- La foto se toma **solo con la cámara** (`ImagePicker.launchCameraAsync`).
  **Nunca** se usa `launchImageLibraryAsync` → no se aceptan imágenes de galería/descargas.
- Se guarda el **timestamp exacto de captura** (`new Date().toISOString()` al resolver la foto).
- Se envía también el **timestamp de inicio de sesión** del usuario (desde `AuthContext`).

### Datos enviados (multipart `POST /api/logistica/paradas/<uuid>/tarea/`)
| Campo | Origen |
|---|---|
| `foto` | captura de cámara (JPEG) |
| `notas` | TextInput multilínea |
| `datos_extra` | `JSON.stringify` del schema dinámico |
| `foto_timestamp` | momento de la captura |
| `sesion_iniciada_at` | login del usuario (AsyncStorage) |

### Datos adicionales (schema dinámico)
Definidos en `src/constants/formSchema.js` (fijo para la demo; en producción vendría del
supervisor vía API). Tipos soportados por el render: `text`, `number`, `select`, `boolean`.

### Backend asociado (resumen)
- Migración `0002` aplicada: campos `foto_url`, `notas`, `foto_timestamp`, `sesion_iniciada_at`
  en `FormularioDinamico`.
- Subida a Drive vía **OAuth de usuario** (no service account, que no tiene cuota sin Workspace).
- La BD guarda **solo la URL** de Drive, no el binario.

---

## 3. Rediseño visual — Sistema de Diseño

### Archivos nuevos
| Archivo | Propósito |
|---|---|
| `src/theme/index.js` | **Punto único de verdad**: `colors`/`COLORS`, `SPACING`, `FONT_SIZES`, `FONTS` (HankenGrotesk), `RADIUS`, `shadow()` (helper `Platform.select`) |
| `src/theme/commonStyles.js` | Utilidades de layout: `flex1`, `row`, `center`, `screen`, `card`… |
| `src/components/StyledText.js` | Tipografía reutilizable: `Heading`, `Subheading`, `BodyText`, `Label`, `Caption` |
| `src/components/AppButton.js` | Botón temático con variantes `primary`/`success`/`outline`/`ghost`, estados `loading`/`disabled`, `useMemo` para estilos condicionales |

> El manual de marca (`src/theme/colors.js`) se mantiene intacto y `theme/index.js` lo re-exporta.

### Buenas prácticas aplicadas (de la skill)
- ✅ Tema centralizado — sin hardcode de colores/espaciados en pantallas.
- ✅ `StyleSheet.create` estático fuera del render.
- ✅ `useMemo` para combinaciones de estilos condicionales (`AppButton`).
- ✅ `Platform.select()` para sombras iOS/Android (`shadow()`).
- ✅ Tipografía HankenGrotesk centralizada en `FONTS`.

---

## 4. Estado por pantalla

| Pantalla | Estado | Notas |
|---|---|---|
| `LoginScreen` | ✅ rediseñada | Conserva `device_id` (JWT device-bound), verificación de reponedor, timeout de 10s y manejo de errores |
| `HomeScreen` | ✅ rediseñada | Conserva check-in GPS + antispoofing, iniciar/omitir ruta; botones unificados con `AppButton` |
| `MapScreen` | ✅ rediseñada | Conserva Google Directions, `decodePolyline`, detección Expo Go, ubicación de usuario, botón "Ajustar", leyenda |
| `TareaEnProcesoScreen` | ✅ nueva + estilada | Cámara-only, timestamps, envío multipart, schema dinámico |

Todos los archivos parsean correctamente (validado con `@babel/parser` + plugin JSX).

---

## 5. Estructura actual de `mobile-app/src`

```
src/
├── components/
│   ├── AppButton.js          (nuevo)
│   └── StyledText.js         (nuevo)
├── constants/
│   ├── api.js                (BACKEND_URL, TUNNEL_URL, LAN_IP)
│   └── formSchema.js         (nuevo — CAMPOS_ADICIONALES)
├── context/
│   └── AuthContext.js        (+ loginTimestamp)
├── hooks/
│   ├── useApi.js             (soporte multipart)
│   └── useSecureLocation.js
├── screens/
│   ├── HomeScreen.js         (rediseñada)
│   ├── LoginScreen.js        (rediseñada)
│   ├── MapScreen.js          (rediseñada)
│   └── TareaEnProcesoScreen.js (nueva)
└── theme/
    ├── colors.js             (marca Venado — intacto)
    ├── commonStyles.js       (nuevo)
    └── index.js              (nuevo — design tokens)
```

---

## 6. Configuración nativa (`app.json`)

- iOS `infoPlist`: `NSCameraUsageDescription` (+ ubicación previa).
- Android `permissions`: `CAMERA` (+ `ACCESS_FINE_LOCATION`, `ACCESS_COARSE_LOCATION`).
- Plugins: `expo-image-picker` (cameraPermission) + `expo-location`.
- `expo-image-picker ~56.0.15` instalado.

> ⚠️ Requiere **development build** (no Expo Go): Google Maps y cámara necesitan build nativo.

---

## 7. Conexión en desarrollo — vía TÚNEL (definitiva)

> Se eligió **túnel** porque la WiFi actual (`10.25.17.x`) bloquea LAN (firewall / client
> isolation): los puertos 8081/8001 dan *timeout* desde la IP LAN. El túnel funciona desde
> cualquier red (datos móviles u otra WiFi) y evita el firewall.

### Resolución de backend (`src/constants/api.js`)
1. Si `TUNNEL_URL` está seteado → tiene prioridad (cualquier red). **← modo actual**
2. Si no, modo LAN → usa el host que Expo expone, o el fallback `LAN_IP` (`10.25.17.235`).

### Arquitectura de túneles
- **Metro (bundle JS, 8081)**: `npx expo start --dev-client --tunnel` (usa `@expo/ngrok`).
- **Backend Django (8001)**: `npx localtunnel --port 8001 --subdomain venado-backend`
  → URL **fija** `https://venado-backend.loca.lt`, ya configurada en `TUNNEL_URL`.
  El `--subdomain` hace que la URL **se conserve** entre reinicios (si está libre), así no
  hay que re-editar `api.js`.

### ⚠️ El túnel de Expo (Metro) sigue siendo efímero
La URL del túnel de Expo cambia al reiniciarse → reabrir el proyecto en el dev-client
(escanear el nuevo QR). El backend (subdominio fijo) normalmente no necesita re-pegarse.
Si `venado-backend` estuviera ocupado, localtunnel asigna otra URL → actualizar `TUNNEL_URL`.

### Dev build (APK) — requiere regenerarse si se agregan módulos nativos
El APK debe incluir los módulos nativos (`expo-image-picker`, `expo-location`, maps).
Build de development en la nube:
```bash
cd mobile-app
npx eas build --profile development --platform android
```
Instalar el APK desde el enlace que entrega EAS (desinstalar el viejo primero).

---

## 8. Comandos útiles (flujo túnel)

```bash
# 1. Backend (Django + PostGIS)
docker compose up -d                       # expone Django en :8001

# 2. Túnel del backend con subdominio fijo (URL estable: https://venado-backend.loca.lt)
npx localtunnel --port 8001 --subdomain venado-backend

# 3. Metro en modo túnel (escanear el QR en el dev-client)
cd mobile-app && npx expo start --dev-client --tunnel

# (cuando se agregan módulos nativos) regenerar el dev build
cd mobile-app && npx eas build --profile development --platform android
```

---

## 9. Pendientes

- [x] Resolver conexión del teléfono → **vía túnel** (Metro + backend por loca.lt).
- [x] Dev build actualizado con cámara (EAS Android, build 79dd7e26).
- [ ] Prueba end-to-end del flujo "Tarea en Proceso" en dispositivo (instalar APK nuevo).
- [ ] (Opcional) Túnel con dominio fijo para no re-pegar `TUNNEL_URL` cada sesión.
- [ ] (Opcional) Mover el schema de "datos adicionales" a un endpoint del supervisor.

## 10. Nuevo Plan: Sesiones Offline
Se ha creado el documento `PLAN_SESION_OFFLINE.md` que detalla la arquitectura offline-first, sesiones sin expiración y registro silencioso de actividades en formato JSON para la futura migración a Supabase.
