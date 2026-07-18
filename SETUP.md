# 🚀 Guía de Configuración Inicial (Setup Guide)

Bienvenido a **Venaris Route AI**. Esta guía está diseñada para acompañarte paso a paso en la primera configuración y ejecución de la plataforma en tu entorno local. 

La plataforma consta de tres componentes principales:
1. **Backend Django & PostGIS** (Lógica, API y Base de Datos)
2. **Dashboard Web Frontend** (Panel para supervisores - React)
3. **Aplicación Móvil** (App para reponedores - React Native / Expo)

---

## 📋 1. Requisitos Previos del Sistema

Antes de comenzar, asegúrate de tener instalado el siguiente software en tu máquina:

- **Git**: Para clonar el repositorio.
- **Docker y Docker Compose**: Para levantar la base de datos PostgreSQL/PostGIS y el backend sin complicaciones.
- **Node.js (v18 o superior)** y **npm/yarn**: Para ejecutar el Frontend y la App Móvil.
- **Python 3.11+** (Opcional, si deseas correr el backend fuera de Docker).
- **Expo Go** (App móvil): Instalada en tu dispositivo físico (iOS o Android) o contar con un emulador configurado en tu PC.

---

## ⚙️ 2. Clonación y Variables de Entorno

**1. Clona el repositorio:**

```bash
git clone https://github.com/AndrewFlovel/AiForGood.git
cd AiForGood
```

**2. Configura las variables de entorno base:**
El backend requiere un archivo `.env` para operar correctamente.

```bash
cp .env.example .env
```

Abre el archivo `.env` y verifica que los datos base estén correctos. Puedes usar las credenciales de prueba proporcionadas en `.env.example` para el entorno de desarrollo local. 
*Nota: Si tienes configurados servicios externos como Firebase o las APIs de Venado, añade las claves correspondientes en este archivo.*

---

## 🐘 3. Iniciar el Backend (Base de Datos y API)

Utilizaremos Docker para levantar rápidamente la base de datos (PostGIS) y el servidor Django. El archivo `docker-compose.yml` está configurado para ejecutar las migraciones necesarias y sembrar la base de datos con información inicial automáticamente.

**1. Verifica que el demonio de Docker esté corriendo en tu máquina.**

**2. Construye y levanta los contenedores en segundo plano:**
```bash
# Asegúrate de estar en la raíz del proyecto
docker compose up -d --build
```

**3. Verifica que los servicios estén corriendo:**
```bash
docker compose ps
```
*Deberías ver los contenedores `db` y `backend` con estado `Up` (o `healthy`).*

**4. (Opcional) Revisa los logs del backend si hay algún problema:**
```bash
docker compose logs -f backend
```
*(Presiona `Ctrl+C` para salir de los logs).*

**Verificación de Acceso:**
- El contenedor `db` se ejecutará en el puerto `5432`.
- El contenedor `backend` se ejecutará exponiendo la API en `http://localhost:8001/api/`.
- *Puedes usar las credenciales por defecto (creadas automáticamente por el comando `init_db` interno):*
  - **Usuario:** `admin`
  - **Contraseña:** `admin123`

---

## 📊 4. Iniciar el Dashboard Frontend

El panel para supervisores está desarrollado en React con Vite.

```bash
# 1. Entra a la carpeta del frontend
cd frontend

# 2. Instala las dependencias
npm install

# 3. Inicia el servidor de desarrollo
npm run dev
```

**Verificación del Frontend:**
- Abre tu navegador y dirígete a la URL que indica Vite (usualmente `http://localhost:5173`).
- Deberías ver la pantalla de inicio de sesión o el dashboard principal.

---

## 📱 5. Iniciar la Aplicación Móvil

La aplicación para los reponedores utiliza React Native y Expo.

```bash
# 1. Vuelve a la raíz y entra a la carpeta mobile-app
cd ../mobile-app

# 2. Instala las dependencias
npm install

# 3. Inicia Expo
npm run start
```

**Verificación de la App Móvil:**
- Verás un código QR en la terminal.
- **Para probar en un dispositivo físico:** Abre la app "Expo Go" en tu celular (o usa la cámara en iOS) y escanea el código QR. Tu teléfono debe estar en la misma red Wi-Fi que tu computadora.
- **Para probar en un emulador:** Presiona la tecla `a` (para Android) o `i` (para iOS) en la terminal donde se ejecuta Expo.

---

## 🎯 6. Validación de la Instalación (Smoke Test)

Para asegurarte de que todo se comunica correctamente:

1. **Prueba la API:** Abre en tu navegador o mediante una herramienta como Postman la URL `http://localhost:8001/api/auth/login/` y deberías ver que la API responde (probablemente con un error 405 Method Not Allowed si usas el navegador, lo cual es normal para un endpoint POST). 
   *⚠️ Nota importante: Si abres directamente `http://localhost:8001/` o `http://localhost:8001/api/`, Django arrojará un error **404 Page Not Found**. Esto es el comportamiento esperado, ya que la API de Django solo tiene rutas registradas bajo `/admin/`, `/api/auth/`, y `/api/logistica/`.*
2. **Corre los tests automatizados (Opcional):**
   Si quieres probar el entorno backend localmente (sin Docker):
   ```bash
   # En la raíz, crea tu entorno virtual y corre tests
   python -m venv .venv
   source .venv/bin/activate
   pip install -r requirements/development.txt
   python test_api.py
   ```

## 🌐 7. Despliegue Público (Producción / Demo)

Esta sección explica cómo exponer la plataforma completa en internet, para que sea accesible fuera de tu red local (útil para la demo del hackathon). El enfoque usado aquí:

- **Base de datos** → [Supabase](https://supabase.com) (Postgres administrado con extensión PostGIS)
- **Backend Django** → sigue corriendo en tu propia máquina/servidor, pero expuesto públicamente vía **Cloudflare Tunnel** (`cloudflared`), en lugar de `localtunnel`/ngrok que se usan solo para pruebas locales de desarrollo
- **Dashboard Web** (`frontend/`) → **Cloudflare Pages**
- **App Móvil** (`mobile-app/`) → build interno vía **EAS**, distribuido con el link que genera Expo

```
Supabase (DB) ← Django (este servidor) ← Cloudflare Tunnel ← Cloudflare Pages (dashboard)
                                                             ← App móvil (EAS build)
```

### 7.1 Base de datos en Supabase

1. Crea un proyecto nuevo en [supabase.com](https://supabase.com).
2. Ve a **SQL Editor** y habilita PostGIS:
   ```sql
   create extension if not exists postgis;
   ```
3. Ve a **Project Settings → Database** y copia los datos de la **conexión directa** (puerto `5432`, no el *connection pooler* de `6543` — Django necesita conexiones persistentes).
4. Usa esos datos para las mismas variables que ya usa `config/settings/base.py` (son las mismas que usa el contenedor `db` local, no requieren cambios de código):
   ```
   DB_NAME=postgres
   DB_USER=postgres
   DB_PASSWORD=<tu-password-de-supabase>
   DB_HOST=db.<tu-project-ref>.supabase.co
   DB_PORT=5432
   ```

### 7.2 Backend público con Cloudflare Tunnel

1. Instala `cloudflared` ([guía oficial](https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/downloads/)) y autentícate:
   ```bash
   cloudflared tunnel login
   cloudflared tunnel create venaris-backend
   ```
2. Enruta un subdominio de tu dominio en Cloudflare hacia el túnel (requiere tener un dominio agregado a Cloudflare):
   ```bash
   cloudflared tunnel route dns venaris-backend api.tu-dominio.com
   ```
3. Crea `~/.cloudflared/config.yml`:
   ```yaml
   tunnel: venaris-backend
   credentials-file: /ruta/a/tu-credentials-file.json

   ingress:
     - hostname: api.tu-dominio.com
       service: http://localhost:8001
     - service: http_status:404
   ```
4. Configura tu `.env` de producción (no reutilices el `.env` de desarrollo):
   ```
   DEBUG=False
   ALLOWED_HOSTS=api.tu-dominio.com
   SECRET_KEY=<genera-una-clave-segura-real>
   ```
   más las variables de Supabase del paso anterior.
5. Levanta el backend en modo producción. El `Dockerfile` ya usa `gunicorn` como `CMD` por defecto (el `docker-compose.yml` local lo sobreescribe con `runserver` solo para desarrollo — en este flujo no se usa `docker compose`, ni el contenedor `db`, porque la base de datos vive en Supabase):
   ```bash
   docker build -t venaris-backend .
   docker run --rm --env-file .env venaris-backend python manage.py migrate
   docker run -d --env-file .env -p 8001:8000 venaris-backend
   ```
6. Levanta el túnel:
   ```bash
   cloudflared tunnel run venaris-backend
   ```
   Para que quede corriendo de forma persistente (no solo mientras la terminal está abierta), instálalo como servicio del sistema: `cloudflared service install`.

### 7.3 Dashboard Web en Cloudflare Pages

1. En el dashboard de Cloudflare, ve a **Workers & Pages → Create → Pages** y conecta el repositorio de GitHub.
2. Configura el build:
   - **Root directory**: `frontend`
   - **Build command**: `npm run build`
   - **Output directory**: `dist`
3. Agrega las variables de entorno de build (usadas por `frontend/src/config/environment.ts` y `frontend/src/modules/auth/pages/RegisterPage.tsx`), apuntando al dominio del túnel del paso anterior:
   ```
   VITE_GRAPHQL_URI=https://api.tu-dominio.com/graphql
   VITE_BACKEND_URL=https://api.tu-dominio.com
   ```
4. Cada push a la rama configurada dispara un build y deploy automático.

### 7.4 App Móvil (Expo / EAS)

1. Desde este mismo servidor (ya cuenta con una sesión de EAS autenticada), genera un build interno:
   ```bash
   cd mobile-app
   npx eas build --profile preview --platform android
   ```
2. Comparte el link de instalación interno que genera EAS al finalizar el build.
3. Actualiza `mobile-app/src/constants/api.js` → `TUNNEL_URL` con el dominio persistente de Cloudflare (`https://api.tu-dominio.com`), reemplazando el túnel efímero de `loca.lt` usado en desarrollo. Recuerda que `TUNNEL_URL` es configuración local y **no se commitea** (ver `mobile-app/ESTADO_APP.md` §7).
4. Para el detalle completo del flujo EAS (perfiles de build, distribución, troubleshooting), consulta `mobile-app/ESTADO_APP.md`.

---

## 🆘 Resolución de Problemas Comunes

- **Error de conexión a la base de datos en Docker:** Asegúrate de que los puertos `5432` u `8000/8001` no estén siendo ocupados por otra aplicación en tu computadora.
- **La App móvil no conecta con la API:** En tu app de Expo, reemplaza `localhost` con la dirección IP local de tu computadora (ej: `192.168.1.X`), ya que el celular no entiende `localhost` como tu PC.
- **Expo Go se cierra inmediatamente al escanear el QR:** Esto ocurre por dos razones principales:
  1. **Versión desactualizada de Expo Go:** Este proyecto usa **Expo SDK 56** (muy reciente). Asegúrate de actualizar la app "Expo Go" en tu teléfono desde la App Store / Play Store.
  2. **Conflicto con Development Build:** El proyecto incluye `expo-dev-client`. Por defecto, Expo puede intentar levantar un "Development Build" en lugar del clásico "Expo Go". Para forzar el modo Expo Go:
     - En la terminal donde corre Expo, **presiona la tecla `s`** para cambiar a modo Expo Go.
     - O cancela el proceso y ejecútalo así: `npx expo start --go -c` (el `-c` limpia la caché que podría estar corrupta).
- **Errores de Node Modules:** Borra la carpeta `node_modules` y el archivo `package-lock.json`, luego vuelve a ejecutar `npm install`.

¡Felicidades! 🎉 Has configurado exitosamente la plataforma local de Venado Route AI. Si tienes dudas respecto a la arquitectura, puedes consultar el [README.md](./README.md) principal.