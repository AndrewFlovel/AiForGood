class ExternalSQLRouter:
    """
    Enruta las consultas a la base de datos externa 'venado_erp'
    para los modelos que posean la propiedad 'use_external_db = True'.
    Garantiza que no se corrompa la base de datos de Antigrabiti.
    """

    def db_for_read(self, model, **hints):
        """Apunta al SQL externo solo si el modelo lo requiere."""
        if getattr(model, "use_external_db", False):
            return "external_sql"
        return "default"

    def db_for_write(self, model, **hints):
        """Apunta al SQL externo para escrituras si es necesario."""
        if getattr(model, "use_external_db", False):
            return "external_sql"
        return "default"

    def allow_relation(self, obj1, obj2, **hints):
        """No permite relaciones (JOINs) entre DB local PostGIS y SQL externo."""
        obj1_ext = getattr(obj1, "use_external_db", False)
        obj2_ext = getattr(obj2, "use_external_db", False)
        
        if obj1_ext and obj2_ext:
            return True
        elif not obj1_ext and not obj2_ext:
            return True
        return False

    def allow_migrate(self, db, app_label, model_name=None, **hints):
        """No migrar tablas hacia la base de datos externa heredada (es intocable)."""
        if db == "external_sql":
            return False
        return db == "default"
