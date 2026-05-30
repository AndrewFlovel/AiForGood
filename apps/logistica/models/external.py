from django.db import models

class ProductoExterno(models.Model):
    """
    Modelo Espejo (Read-Only) mapeado directamente a la base de datos SQL Externa
    del ERP de Industrias Venado. Nuestro ExternalSQLRouter se encarga del resto.
    """
    
    # BANDERA DE INYECCIÓN AL ROUTER
    use_external_db = True

    codigo_sku = models.CharField(
        max_length=100,
        primary_key=True,
    )
    nombre = models.CharField(max_length=255)
    precio_referencial = models.DecimalField(
        max_digits=10,
        decimal_places=2,
    )
    stock_global = models.IntegerField()

    class Meta:
        # Nombre de la tabla REAL que ya existe en la DB SQL heredada de la empresa
        db_table = "venado_erp_productos"
        
        # Django NUNCA intentará hacer CREATE TABLE ni ALTER TABLE en este modelo
        managed = False
