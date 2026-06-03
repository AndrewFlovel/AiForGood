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

## 7. Conexión en desarrollo — estado y pendiente

### Resolución de backend (`src/constants/api.js`)
1. Si `TUNNEL_URL` está seteado → tiene prioridad (cualquier red).
2. Si no, modo LAN → usa el host que Expo expone, o el fallback `LAN_IP`.
   - `LAN_IP` actual: **`10.15.175.235`** (IP de la laptop al 2026-05-31).

### ⚠️ Bloqueo pendiente: firewall de la laptop
- Metro responde en `localhost:8081` (✅) pero **da timeout desde la IP LAN** `10.15.175.235:8081`.
- Mismo síntoma con Django `:8001`. *Timeout* (no "rechazado") ⇒ **firewall descartando paquetes**.
- Por eso el teléfono **no logra conectarse** en modo LAN.

### Cómo resolverlo (elegir una)
**A. Abrir puertos (ufw):**
```bash
sudo ufw allow 8081/tcp
sudo ufw allow 8001/tcp
# en el teléfono (dev build → Enter URL): http://10.15.175.235:8081
```

**B. USB con adb (evita WiFi y firewall) — recomendado para demo:**
```bash
sudo apt install -y android-tools-adb
adb devices                 # aceptar "Permitir depuración USB" en el teléfono
adb reverse tcp:8081 tcp:8081
adb reverse tcp:8001 tcp:8001
# en el teléfono usar: http://localhost:8081
```
> Si se usa USB, cambiar `LAN_IP = 'localhost'` en `src/constants/api.js`.

**C. Tunnel (ngrok):** `npx expo start --dev-client --tunnel`
> Falló antes por un outage de ngrok; reintentar si el servicio se recuperó.

---

## 8. Comandos útiles

```bash
# Levantar Metro en modo LAN fijando la IP
cd mobile-app
REACT_NATIVE_PACKAGER_HOSTNAME=10.15.175.235 npx expo start --dev-client --lan

# Backend (Django + PostGIS)
docker compose up -d        # expone Django en :8001
```

---

## 9. Pendientes

- [ ] Resolver firewall / conexión del teléfono (sección 7).
- [ ] Prueba end-to-end del flujo "Tarea en Proceso" en dispositivo.
- [ ] Commit + push a GitHub (feature Drive + rediseño). **No commitear `.env` ni credenciales.**
- [ ] (Opcional) Mover el schema de "datos adicionales" a un endpoint del supervisor.
