---
name: route-optimization-dijkstra
description: Skill para implementar optimización de rutas utilizando el algoritmo de Dijkstra apoyado en los datos de la API de Google Maps.
---

# Optimización de Rutas con Dijkstra y Google Maps

Esta skill proporciona los lineamientos y pasos necesarios para que el agente implemente un sistema de optimización de rutas dentro del proyecto Venado Route AI (Django). Se basa en extraer localizaciones de la base de datos, consultar los tiempos y distancias reales a la API de Google Maps, y aplicar el algoritmo de Dijkstra para encontrar los caminos más eficientes.

## 1. Requisitos Previos

- **Credenciales:** La variable de entorno `GOOGLE_MAPS_API_KEY` debe estar correctamente configurada en el archivo `.env`.
- **Dependencias Recomendadas:** 
  - `googlemaps` (Cliente oficial de Python para Google Maps Services).
  - `networkx` (Opcional, pero muy útil para construir y analizar grafos).
  Asegúrate de agregarlas a `requirements/base.txt`.
- **Modelos:** Las coordenadas geográficas usualmente provienen de los modelos de la app `logistica` (ej. `RutaAsignada`), utilizando atributos de tipo `Point` (PostGIS).

## 2. Estructura Sugerida

El código debe residir preferentemente en la capa de servicios de la aplicación de logística:
`apps/logistica/services/route_optimization.py`

## 3. Flujo de Implementación

### Paso 1: Extracción de Nodos (Sucursales/Puntos)
Recupera los puntos geográficos (latitud y longitud) de los modelos de Django que formarán parte de la red de la ruta (por ejemplo, el punto de partida y los diferentes destinos/sucursales).

### Paso 2: Obtención de Pesos (Google Maps Distance Matrix API)
Utiliza la API de Distance Matrix para calcular la distancia real o el tiempo de viaje (con tráfico) entre todos los pares de puntos. Estos valores actuarán como los "pesos" o "costos" de las aristas en nuestro grafo.

```python
import googlemaps
from django.conf import settings

gmaps = googlemaps.Client(key=settings.GOOGLE_MAPS_API_KEY)

# Ejemplo de consulta a la Distance Matrix API
# origins = [(lat1, lon1), (lat2, lon2), ...]
# destinations = origins
# result = gmaps.distance_matrix(origins, destinations, mode="driving")
```

### Paso 3: Construcción del Grafo
Representa los puntos como un grafo dirigido o no dirigido, donde:
- **Nodos:** Representan las localizaciones (IDs de Sucursales o Coordenadas).
- **Aristas:** Representan el camino directo entre dos localizaciones.
- **Peso:** El tiempo en segundos o la distancia en metros devuelta por Google Maps.

### Paso 4: Algoritmo de Dijkstra
Implementa el algoritmo de Dijkstra para calcular el camino más corto (menor costo/tiempo) desde un nodo origen hacia todos los demás nodos, o entre dos nodos específicos.

*Nota:* Si el problema requiere visitar **múltiples nodos y volver al inicio** (TSP - Problema del Agente Viajero), Dijkstra por sí solo halla la distancia óptima entre 2 puntos. Para el TSP, usa los pesos de Google Maps para crear la matriz de adyacencia y aplica un algoritmo de aproximación de TSP. Sin embargo, para encontrar la ruta óptima de un punto A a un punto B a través de una red específica, Dijkstra es la herramienta adecuada.

```python
import heapq

def dijkstra(grafo, origen):
    distancias = {nodo: float('infinity') for nodo in grafo}
    distancias[origen] = 0
    pq = [(0, origen)]
    caminos = {nodo: [] for nodo in grafo}
    
    while pq:
        distancia_actual, nodo_actual = heapq.heappop(pq)
        
        if distancia_actual > distancias[nodo_actual]:
            continue
            
        for vecino, peso in grafo[nodo_actual].items():
            distancia = distancia_actual + peso
            if distancia < distancias[vecino]:
                distancias[vecino] = distancia
                caminos[vecino] = caminos[nodo_actual] + [nodo_actual]
                heapq.heappush(pq, (distancia, vecino))
                
    return distancias, caminos
```

## 4. Mejores Prácticas

- **Caché:** Las llamadas a la API de Google Maps tienen un costo. Se recomienda usar la caché de Django (`django.core.cache`) o almacenar temporalmente la matriz de distancias en la base de datos (o Redis) si los puntos no cambian con frecuencia.
- **Asincronía:** Si la red de puntos es muy grande, procesa la obtención de la matriz de distancias en segundo plano (usando Celery u otra herramienta de background tasks si está disponible en el stack).
- **Tratamiento de Errores:** Valida siempre la respuesta de la API de Google Maps. Maneja casos de `ZERO_RESULTS`, donde no hay rutas terrestres disponibles entre dos puntos.

## 5. Salida del Servicio

El servicio de optimización debe devolver una estructura de datos clara (lista de diccionarios o IDs ordenados) que la API (Django REST Framework) pueda serializar fácilmente para ser consumida por la aplicación móvil o el frontend.
