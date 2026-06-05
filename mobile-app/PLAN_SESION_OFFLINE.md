# Plan de Implementación: Sesiones y Registro de Actividad Offline

Este documento detalla los pasos para implementar el manejo de sesiones prolongadas y el registro silencioso de actividades offline, con sincronización en formato JSON, orientado a la futura integración con Supabase.

## 1. Persistencia de Sesión Larga (Sin Refresh Tokens)
**Objetivo:** Mantener al reponedor autenticado de forma continua durante toda su jornada, sin interrupciones por expiración de token.
*   **Modificar `AuthContext.js`:**
    *   Guardar los datos del usuario (ID, nombre) y el token de autenticación en `AsyncStorage` al completar un login exitoso.
    *   Eliminar cualquier mecanismo de expiración automática de sesión. La sesión será mantenida abierta hasta que se ejecute el cierre manual.
    *   Al abrir la app, validar si existen los datos en `AsyncStorage` y, de ser así, redirigir automáticamente al Home (saltando la pantalla de Login).

## 2. Registro Silencioso de Actividades (Offline-First)
**Objetivo:** Almacenar cada interacción del reponedor en el dispositivo para que no se pierda ningún evento si no hay internet.
*   **Formato de Almacenamiento (JSON):**
    ```json
    {
      "id": "uuid-v4",
      "user_id": "id-del-reponedor",
      "action_type": "CHECK_IN_GPS | FOTO_EVIDENCIA | RUTAS_ACTUALIZADAS",
      "timestamp": "2026-06-04T10:30:00.000Z",
      "details": {
        "latitud": -33.456,
        "longitud": -70.648,
        "parada_id": "uuid-parada"
      },
      "synced": false
    }
    ```
*   **Implementación de `src/services/ActivityLogger.js`:**
    *   Exponer función `logAction(type, details)`: Esta función tomará los datos, los empaquetará como un objeto JSON y los almacenará en un array persistente en `AsyncStorage` (ej. clave `@venado_activity_logs`).
    *   Integrar llamadas a `logAction` en botones y flujos vitales de la UI.

## 3. Sincronización en Background
**Objetivo:** Transmitir los datos al servidor cuando se recupere la conectividad.
*   **Detección de Red:** Utilizar `@react-native-community/netinfo` para observar la disponibilidad de conexión de forma pasiva.
*   **Mecanismo de Subida:**
    *   Al detectar conexión activa, extraer todos los logs con `"synced": false`.
    *   Enviar un array con formato JSON (lote) al servidor backend o enviar directamente vía endpoint RPC si se está utilizando Supabase.
    *   Si la respuesta del servidor es satisfactoria (`200 OK`), limpiar los registros en `AsyncStorage` para liberar espacio, o marcarlos como `synced: true`.

## 4. Interfaz de "Estado de Sesión"
**Objetivo:** Otorgar seguridad al reponedor para que valide bajo qué usuario está realizando sus tareas.
*   **Implementar `ProfileScreen.js` (o Modal en Home):**
    *   **Identidad:** Mostrar claramente el nombre y el ID de usuario activo ("Sesión activa como: Juan Pérez").
    *   **Estado de Red:** Indicador visual (verde/rojo) que muestre si la app se encuentra en modo "Conectado" o "Trabajando sin conexión".
    *   **Registro de Actividades:** Mostrar un contador de las acciones registradas localmente ("5 acciones pendientes de enviar") y el historial de horas.

## 5. Cierre de Sesión y Fin de Jornada
**Objetivo:** Terminar el flujo del día de forma segura y controlada.
*   **Botón de Cierre en `ProfileScreen.js`:**
    *   **Acción "Finalizar Jornada y Cerrar Sesión"**.
    *   **Comprobación de Sincronización:** Al presionar, el sistema verifica primero si hay actividades con `"synced": false`.
    *   Si existen datos locales sin enviar y *hay internet*, forzar el envío antes de permitir el cierre.
    *   Si existen datos sin enviar y *no hay internet*, mostrar un `Alert` de advertencia: *"Tienes registros de la jornada que no han podido enviarse. Conéctate a internet antes de finalizar la jornada para no perder el progreso de tu visita"*. No permitir el cierre a menos que sea forzado por el usuario bajo su propio riesgo.
    *   **Limpieza Total:** Si es seguro cerrar, borrar `@venado_token`, `@venado_user` y el registro local de actividades en `AsyncStorage` para dejar el equipo limpio, redirigiendo luego a la pantalla `LoginScreen`.
