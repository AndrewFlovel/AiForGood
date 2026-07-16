# Estado de la App Móvil — Venado Logística

> Última actualización: 2026-07-16
> Stack: Expo SDK 57 · React Native · @react-navigation/native-stack · dev build (NO Expo Go)

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
    ├── colors.js             (marca Venaris Route)
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

> 🔒 **`TUNNEL_URL` es configuración LOCAL por desarrollador — NO se commitea.**
> Durante el setup, cada quien pega su propia URL de túnel en `src/constants/api.js`;
> ese cambio es efímero y específico de la máquina, así que debe quedar **fuera de los
> commits** (déjalo en el working tree). El repo mantiene `TUNNEL_URL = ''` por defecto.

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
El APK debe incluir los módulos nativos (`expo-image-picker`, `expo-location`, maps,
`expo-network`).
Build de development en la nube:
```bash
cd mobile-app
npx eas build --profile development --platform android
```
Instalar el APK desde el enlace que entrega EAS (desinstalar el viejo primero).

> ⚠️ **Rebuild pendiente (superado por el upgrade a SDK 57, ver §11):** el dev build
> instalado en el dispositivo fue compilado contra el ABI nativo de SDK 56 y **no cargará**
> un bundle JS de SDK 57 — no es solo `expo-network`, ahora es todo el set de módulos
> nativos. **Regenerar el dev build es obligatorio antes de cualquier prueba en
> dispositivo** (no solo para validar conectividad).

### 🗺️ Mapa gris en "Ver mapa" — troubleshooting

Síntoma: `MapScreen` aparece **todo gris** con el botón de diana (My Location) visible,
pero los *tiles* de Google nunca cargan (Android). El `MapView` se monta bien (por eso
ves el control) → el problema es la **autenticación del SDK nativo de Google Maps**, no
el código.

Causas y orden de arreglo:

1. **Habilitar "Maps SDK for Android"** en Google Cloud (la causa más común).
   `console.cloud.google.com` → proyecto de la key → **APIs y servicios → Biblioteca →
   "Maps SDK for Android" → Habilitar**. Esperar 2–5 min y reabrir el mapa.
   > Ojo: **Directions API ≠ Maps SDK for Android** son APIs distintas. La key puede
   > funcionar para la ruta (Directions, llamada HTTP en `api.js`) y aun así dar el mapa
   > gris si Maps SDK for Android está deshabilitado. Verificado: la Directions API
   > responde `status: OK` con la key actual → billing OK, key válida.

2. **Regenerar el dev build si el APK es viejo.** La key
   (`app.json → android.config.googleMaps.apiKey`) se **hornea en el `AndroidManifest`
   en build-time**; recargar el JS no la agrega. Si el APK instalado se compiló antes de
   tener la key → mapa gris hasta hacer `eas build --profile development --platform android`
   y reinstalar.

3. **Restricciones de la key (seguridad).** La key está hoy *sin restricción* y commiteada.
   Al restringirla, recordar: una key restringida a *"Aplicaciones Android"* sirve al SDK
   nativo **pero NO** a la llamada HTTP de Directions (`api.js`) → la rompe. Solución:
   **dos keys** — una Android (package `com.andrewflovel.venadologistica` + SHA‑1 del
   keystore vía `npx eas credentials`) y otra web restringida por API/IP para Directions.

Diagnóstico fino: `adb logcat | grep -i "Google Maps\|Authorization"` al abrir el mapa
muestra el mensaje exacto (p.ej. *"ensure that the Maps SDK for Android is enabled"*) y el
`SHA-1;package` que GCP espera.

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
- [ ] **Mapa gris**: habilitar "Maps SDK for Android" en GCP (+ rebuild si el APK no trae la key). Ver §7 troubleshooting.
- [ ] (Opcional) Túnel con dominio fijo para no re-pegar `TUNNEL_URL` cada sesión.
- [ ] (Opcional) Mover el schema de "datos adicionales" a un endpoint del supervisor.
- [ ] **Rebuild dev-client para SDK 57** (ver §11) antes de cualquier prueba en dispositivo.
- [ ] Revisar si `RECORD_AUDIO` (nuevo, ver §11) debe suprimirse en `expo-image-picker`.

## 10. Nuevo Plan: Sesiones Offline
Se ha creado el documento `PLAN_SESION_OFFLINE.md` que detalla la arquitectura offline-first, sesiones sin expiración y registro silencioso de actividades en formato JSON para la futura migración a Supabase.

---

## 11. Sesión 2026-07-16 — Upgrade a Expo SDK 57

- `expo` 56.0.9 → 57.x, `react-native` 0.85.3 → 0.86.0, `react` sin cambios (19.2.3). Todos
  los paquetes `expo-*` actualizados a sus versiones compatibles con SDK 57 vía
  `npx expo install expo@57 --fix`. `react-native-maps`/`screens`/`safe-area-context`/
  `async-storage` ya eran compatibles, sin cambios.
- `app.json → plugins`: el instalador agregó automáticamente `expo-font` y
  `expo-status-bar` — nuevo requisito de SDK 57, no manual.
- `npx expo-doctor`: 19/20 checks OK. El único check fallido (`eas-cli` no debería ser
  dependencia del proyecto) es preexistente, no relacionado al upgrade.
- ⚠️ **Nuevo permiso detectado**: el manifest ahora pide `android.permission.RECORD_AUDIO`,
  no presente antes del upgrade. Probablemente viene de `expo-image-picker@~57.0.2`
  (soporte de video en el picker) arrastrado por el bump de SDK, no agregado a propósito.
  Revisar si conviene suprimirlo vía config del plugin `expo-image-picker` en `app.json`
  si la app solo necesita fotos.
- Sesión de EAS **sí está autenticada** en esta máquina (`andrewflovel` /
  andrew.flovel@gmail.com) — `npx eas build --profile development --platform android` se
  puede ejecutar directamente sin login adicional.
- Ver §7 "Rebuild pendiente" — aplica para SDK 57, no solo `expo-network`.
