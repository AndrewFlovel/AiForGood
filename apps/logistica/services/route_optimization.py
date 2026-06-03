import heapq
import googlemaps
from django.conf import settings
import networkx as nx

def get_googlemaps_client():
    if not hasattr(settings, 'GOOGLE_MAPS_API_KEY') or not settings.GOOGLE_MAPS_API_KEY:
        raise ValueError("GOOGLE_MAPS_API_KEY no está configurado en los settings.")
    return googlemaps.Client(key=settings.GOOGLE_MAPS_API_KEY)

def get_distance_matrix(points):
    """
    points: Lista de tuplas (latitud, longitud)
    Retorna la matriz de distancias usando la API de Google Maps.
    """
    gmaps = get_googlemaps_client()
    # La API de Google Maps Distance Matrix acepta hasta 25 origins y 25 destinations por petición
    # Asumimos que points es pequeño (<25) para este ejemplo.
    origins = points
    destinations = points
    
    result = gmaps.distance_matrix(origins, destinations, mode="driving")
    return result

def build_graph_from_matrix(points, distance_matrix):
    """
    Construye un grafo donde los nodos son los índices de 'points' y las aristas
    tienen como peso el tiempo de viaje en segundos (o distancia).
    """
    G = nx.DiGraph()
    
    for i, origin in enumerate(points):
        G.add_node(i, pos=origin)
        
    rows = distance_matrix.get('rows', [])
    for i, row in enumerate(rows):
        elements = row.get('elements', [])
        for j, element in enumerate(elements):
            if i != j and element.get('status') == 'OK':
                # Usamos duración en segundos como peso
                duration = element['duration']['value']
                distance = element['distance']['value']
                G.add_edge(i, j, weight=duration, distance=distance)
                
    return G

def dijkstra_shortest_path(graph, start_node, end_node=None):
    """
    Implementación del algoritmo de Dijkstra para encontrar el camino más corto
    en el grafo, basándonos en el peso.
    """
    distancias = {nodo: float('infinity') for nodo in graph.nodes}
    distancias[start_node] = 0
    pq = [(0, start_node)]
    caminos = {nodo: [] for nodo in graph.nodes}
    
    while pq:
        distancia_actual, nodo_actual = heapq.heappop(pq)
        
        if distancia_actual > distancias[nodo_actual]:
            continue
            
        for vecino in graph.successors(nodo_actual):
            peso = graph[nodo_actual][vecino]['weight']
            distancia = distancia_actual + peso
            if distancia < distancias[vecino]:
                distancias[vecino] = distancia
                caminos[vecino] = caminos[nodo_actual] + [nodo_actual]
                heapq.heappush(pq, (distancia, vecino))
                
    if end_node is not None:
        return distancias[end_node], caminos[end_node] + [end_node]
    
    return distancias, caminos

def optimize_route(pdvs, start_pdv_index=0):
    """
    Dado un queryset o lista de PDVs, optimiza la ruta desde un PDV inicial
    hasta los demás, usando la matriz de distancias y Dijkstra.
    (Implementación simplificada)
    """
    # Extraer coordenadas
    points = [(pdv.location.y, pdv.location.x) for pdv in pdvs]
    
    if len(points) < 2:
        return pdvs

    # 1. Obtener la matriz de Google Maps
    matrix = get_distance_matrix(points)
    
    # 2. Construir grafo
    graph = build_graph_from_matrix(points, matrix)
    
    # 3. Dijkstra desde el punto de inicio
    distancias, caminos = dijkstra_shortest_path(graph, start_node=start_pdv_index)
    
    # Esta es una optimización básica: ordenar por cercanía al punto de inicio (Dijkstra puro)
    # Para TSP (orden óptimo) se usaría un algoritmo de aproximación, pero la skill pide Dijkstra.
    # Ordenaremos los PDVs basándonos en la distancia desde el nodo de inicio.
    ordered_indices = sorted(distancias.keys(), key=lambda k: distancias[k])
    
    optimized_pdvs = [pdvs[i] for i in ordered_indices]
    
    return optimized_pdvs
