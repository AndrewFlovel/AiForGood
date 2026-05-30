from gql import Client, gql
from gql.transport.requests import RequestsHTTPTransport
from django.conf import settings
import logging

logger = logging.getLogger(__name__)

class GraphQLConsumer:
    """
    Cliente robusto para consumir los servicios GraphQL de Industrias Venado.
    Aislado en 'integrity/' para evitar fallos en cascada si el ERP cae.
    """
    def __init__(self):
        self.endpoint = settings.GRAPHQL_ENDPOINT
        
        # Transporte HTTP con manejo de reintentos para resiliencia de red
        self.transport = RequestsHTTPTransport(
            url=self.endpoint,
            verify=True,
            retries=3,
        )
        
        self.client = Client(
            transport=self.transport,
            fetch_schema_from_transport=False,
        )

    def execute_query(self, query_string: str, variables: dict = None) -> dict:
        """
        Ejecuta una query GraphQL con manejo estricto de errores.
        """
        if variables is None:
            variables = {}
            
        try:
            query = gql(query_string)
            result = self.client.execute(
                query,
                variable_values=variables,
            )
            return result
        except Exception as e:
            logger.error(
                f"Error crítico conectando con GraphQL ERP: {str(e)}",
                exc_info=True,
            )
            raise Exception(f"Fallo en integración GraphQL: {str(e)}")
