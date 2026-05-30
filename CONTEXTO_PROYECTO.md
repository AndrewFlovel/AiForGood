# Contexto del Proyecto: mi-proyecto-hackathon

## 🎯 Resumen del Proyecto
El proyecto es una solución tecnológica para **Industrias Venado (Canal Tradicional de La Paz)**. Está enfocado en optimizar y digitalizar la logística de los reponedores en campo y dar visibilidad en tiempo real a los supervisores.

## 🗄️ Base de Datos y Lógica Core (Supabase + PostgreSQL)
La arquitectura de base de datos es muy robusta y está optimizada en el archivo `venado_schema.sql` (648 líneas) que incluye:
*   **Extensiones:** Uso avanzado de `PostGIS` (para calcular distancias reales geográficas entre PDVs), `pgcrypto` para UUIDs seguros y `pg_trgm`.
*   **Gestión de Usuarios:** Sistema de roles jerárquicos (Supervisores y Reponedores).
*   **Segmentación Comercial:** Tipos de cliente (Mayorista, Minorista, Detallista) con tiempos y tareas por defecto basadas en datos reales de Venado.
*   **Gestión de PDVs y Rutas:** Puntos de venta con coordenadas exactas. Destaca la implementación de un algoritmo de **Vecino más Cercano (Nearest Neighbor TSP)** directamente en la base de datos (mediante la función `generate_route_nearest_neighbor`) para trazar las rutas diarias óptimas de cada reponedor.
*   **Operación en Campo:** Tablas para rastrear visitas, ejecución de micro-tareas (con fotos como evidencia), solicitudes de reposición urgentes y métricas de desviaciones de tiempo.
*   **Dashboarding:** Una vista (`vw_supervisor_dashboard`) y vistas materializadas para analizar los tiempos reales y pendientes en vivo.

## ⚙️ Automatización e Infraestructura
*   **Migración Node.js:** En `migrate.js` (con `package.json` configurado) hay un script que se conecta mediante connection pooling a la instancia de **Supabase** y ejecuta una limpieza y el *seed* completo del esquema de la base de datos en un solo comando.
*   **Datos Semilla (Seed):** Precarga de mercados reales (Chasquipampa, Achumani, etc.), clientes base, tareas, y una estructura de 23 reponedores y 3 supervisores.

## 🤖 Configuración para Agentes IA (MCP)
*   **Contexto de Asistentes:** Archivos guía específicos (`CLAUDE.md`, `AGENTS.md`) para orientar a los asistentes IA dentro del repositorio.
*   **Integración de Herramientas:** En `.agents/mcp_config.json` están configurados **Servidores MCP (Model Context Protocol)**, vinculando la instancia de **Supabase** (`ytteimsocjxsbshunbws`) y un servidor de **GitHub** con su respectivo token, dándole a los agentes capacidad de interactuar directamente con la base de datos y repositorio.

## 🚀 Estado Actual y Próximos Pasos
*   La **base de datos y el enrutamiento geoespacial** ya están completados.
*   Las carpetas `src/` (para el código de la app/backend) y `tests/` están creadas pero actualmente vacías (solo contienen `.gitkeep`).

### Próximos Pasos Recomendados:
1.  Crear una **API (Backend)** en `src/` (quizás con Express, Fastify, o usar directamente Supabase REST/GraphQL).
2.  Desarrollar una interfaz/app para los **Reponedores** (para ver su ruta y marcar tareas).
3.  Desarrollar el **Dashboard Web** para los Supervisores consumiendo las vistas creadas.
