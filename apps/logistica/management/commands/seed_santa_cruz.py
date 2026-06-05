"""
Seed de datos de prueba — Santa Cruz de la Sierra, Bolivia
4 mercados reales: 2 PDVs MAYORISTA + 2 PDVs MINORISTA

Uso:
    docker compose exec backend python manage.py seed_santa_cruz
    docker compose exec backend python manage.py seed_santa_cruz --reset
"""

import random
from datetime import date, timedelta, datetime
from decimal import Decimal

from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from django.contrib.gis.geos import Point
from django.utils import timezone

from apps.logistica.models import (
    Market, ClientType, PDV, Route, RouteStop, Visit,
    RestockRequest, ProductIssue, FormularioDinamico,
)

User = get_user_model()

# ──────────────────────────────────────────────────────────────────────────────
# Datos geográficos reales de Santa Cruz de la Sierra
# ──────────────────────────────────────────────────────────────────────────────

MERCADOS_SC = [
    {
        "name": "LOS POZOS",
        "city": "Santa Cruz de la Sierra",
        "zone": "Centro",
        "lat": -17.7843, "lng": -63.1814,
    },
    {
        "name": "ABASTO NORTE",
        "city": "Santa Cruz de la Sierra",
        "zone": "Norte",
        "lat": -17.7650, "lng": -63.1900,
    },
    {
        "name": "LA RAMADA",
        "city": "Santa Cruz de la Sierra",
        "zone": "Noroeste",
        "lat": -17.7550, "lng": -63.2100,
    },
    {
        "name": "MUTUALISTA SUR",
        "city": "Santa Cruz de la Sierra",
        "zone": "Sur",
        "lat": -17.8050, "lng": -63.1700,
    },
]

PDVS_SC = [
    # ── MAYORISTAS ─────────────────────────────────────────────────────────────
    {
        "code":       "SC001",
        "client_code": "SC-MAY-001",
        "mercado":    "LOS POZOS",
        "categoria":  "MAYORISTA",
        # Supermercado El Arenal — a 130m del mercado Los Pozos
        "lat": -17.7858, "lng": -63.1826,
        "minutos":    50,
        "dias": {"L": True, "X": True, "V": True},
        "semanal": 3, "mensual": 12,
        "notas": "Mayorista principal zona centro. Requiere bandeo y conteo de stock.",
    },
    {
        "code":       "SC002",
        "client_code": "SC-MAY-002",
        "mercado":    "ABASTO NORTE",
        "categoria":  "MAYORISTA",
        # Distribuidora Norte — a 160m del mercado Abasto
        "lat": -17.7663, "lng": -63.1914,
        "minutos":    45,
        "dias": {"M": True, "J": True, "S": True},
        "semanal": 3, "mensual": 12,
        "notas": "Distribuidor zona norte. Alto volumen de Caldito y Salsa Venado.",
    },
    # ── MINORISTAS ─────────────────────────────────────────────────────────────
    {
        "code":       "SC003",
        "client_code": "SC-MIN-001",
        "mercado":    "LA RAMADA",
        "categoria":  "MINORISTA",
        # Tienda La Ramada — a 120m del mercado
        "lat": -17.7562, "lng": -63.2108,
        "minutos":    25,
        "dias": {"L": True, "X": True, "V": True},
        "semanal": 3, "mensual": 12,
        "notas": "Minorista zona noroeste. Mucho movimiento de panificación.",
    },
    {
        "code":       "SC004",
        "client_code": "SC-MIN-002",
        "mercado":    "MUTUALISTA SUR",
        "categoria":  "MINORISTA",
        # Bodeguita Sur — a 110m del mercado
        "lat": -17.8058, "lng": -63.1718,
        "minutos":    20,
        "dias": {"M": True, "J": True, "S": True},
        "semanal": 3, "mensual": 12,
        "notas": "Minorista zona sur. Rotación alta de productos de limpieza.",
    },
]

# Productos Venado reales para los requests de reposición
PRODUCTOS_VENADO = [
    "Salsa de Tomate Venado 390g",
    "Caldito Venado x12",
    "Sal Fina Venado 1kg",
    "Levadura Venado 11g x10",
    "Mayonesa Venado 500g",
    "Salsa Inglesa Venado 150ml",
    "Vinagre Venado 1L",
    "Mostaza Venado 300g",
]


class Command(BaseCommand):
    help = "Seed de datos de prueba con 4 mercados de Santa Cruz de la Sierra"

    def add_arguments(self, parser):
        parser.add_argument(
            "--reset",
            action="store_true",
            help="Elimina datos SC existentes antes de insertar",
        )

    def handle(self, *args, **options):
        random.seed(42)  # reproducible

        if options["reset"]:
            self._reset()

        self.stdout.write(self.style.WARNING("── Santa Cruz de la Sierra — Seed ──"))

        tipo_mayorista = ClientType.objects.get(category="MAYORISTA")
        tipo_minorista = ClientType.objects.get(category="MINORISTA")

        # 1. Mercados
        mercados = self._crear_mercados()

        # 2. PDVs
        pdvs = self._crear_pdvs(mercados, tipo_mayorista, tipo_minorista)

        # 3. Usuario reponedor Santa Cruz
        rep_sc = self._crear_reponedor()

        # 4. Ruta de hoy (pending — lista para iniciar y optimizar)
        self._crear_ruta_hoy(rep_sc, pdvs)

        # 5. Historial: 5 días de rutas completadas
        visitas = self._crear_historico(rep_sc, pdvs, dias=5)

        # 6. Solicitudes de reposición (1 por nivel de urgencia)
        self._crear_restock_requests(rep_sc, pdvs, visitas)

        # 7. Productos vencidos/dañados encontrados en campo
        self._crear_product_issues(rep_sc, pdvs, visitas)

        self.stdout.write(self.style.SUCCESS("\n✅ Seed Santa Cruz completado."))
        self._imprimir_resumen(rep_sc, pdvs)

    # ──────────────────────────────────────────────────────────────────────────
    # Pasos individuales
    # ──────────────────────────────────────────────────────────────────────────

    def _reset(self):
        self.stdout.write("  🗑  Eliminando datos SC previos...")
        codigos = [p["code"] for p in PDVS_SC]
        pdvs = PDV.objects.filter(code__in=codigos)
        RouteStop.objects.filter(pdv__in=pdvs).delete()
        PDV.objects.filter(code__in=codigos).delete()
        nombres = [m["name"] for m in MERCADOS_SC]
        Market.objects.filter(name__in=nombres, city__icontains="Santa Cruz").delete()
        User.objects.filter(username="reponedor_sc").delete()
        self.stdout.write("     Listo.")

    def _crear_mercados(self):
        mercados = {}
        for m in MERCADOS_SC:
            obj, created = Market.objects.get_or_create(
                name=m["name"],
                defaults={"city": m["city"], "zone": m["zone"]},
            )
            mercados[m["name"]] = obj
            self.stdout.write(f"  {'✅' if created else '↩'} Mercado: {m['name']} ({m['city']})")
        return mercados

    def _crear_pdvs(self, mercados, tipo_mayorista, tipo_minorista):
        pdvs = {}
        tipos = {"MAYORISTA": tipo_mayorista, "MINORISTA": tipo_minorista}
        dia_map = {"L": "visit_mon", "M": "visit_tue", "X": "visit_wed",
                   "J": "visit_thu", "V": "visit_fri", "S": "visit_sat"}

        for p in PDVS_SC:
            dias_kwargs = {v: False for v in dia_map.values()}
            for letra, campo in dia_map.items():
                if p["dias"].get(letra):
                    dias_kwargs[campo] = True

            pdv, created = PDV.objects.get_or_create(
                code=p["code"],
                defaults={
                    "client_code": p["client_code"],
                    "market": mercados[p["mercado"]],
                    "client_type": tipos[p["categoria"]],
                    "location": Point(p["lng"], p["lat"], srid=4326),
                    "visit_minutes_estimated": p["minutos"],
                    "weekly_frequency": p["semanal"],
                    "monthly_frequency": p["mensual"],
                    "notes": p["notas"],
                    **dias_kwargs,
                },
            )
            pdvs[p["code"]] = pdv
            icono = "🏪" if p["categoria"] == "MAYORISTA" else "🛒"
            self.stdout.write(
                f"  {'✅' if created else '↩'} {icono} PDV {p['code']} "
                f"({p['categoria']}) — {p['mercado']}"
            )
        return pdvs

    def _crear_reponedor(self):
        rep, created = User.objects.get_or_create(
            username="reponedor_sc",
            defaults={
                # Convención del proyecto: el rol se guarda en last_name.
                # El nombre real (Carlos Montaño) va completo en first_name.
                "first_name": "Carlos Montaño",
                "last_name": "Reponedor",
                "email": "reponedor.sc@venaris.com",
            },
        )
        if created:
            rep.set_password("reposc123")
            rep.save()
        self.stdout.write(
            f"  {'✅' if created else '↩'} Reponedor: reponedor_sc / reposc123"
        )
        return rep

    def _crear_ruta_hoy(self, rep, pdvs):
        hoy = date.today()
        ruta, created = Route.objects.get_or_create(
            replenisher=rep,
            route_date=hoy,
            defaults={
                "status": "pending",
                "total_pdvs": len(pdvs),
            },
        )
        if not created:
            self.stdout.write("  ↩  Ruta de hoy ya existe, omitiendo stops.")
            return

        lista_pdvs = list(pdvs.values())
        for orden, pdv in enumerate(lista_pdvs, start=1):
            RouteStop.objects.create(
                route=ruta,
                pdv=pdv,
                stop_order=orden,
                estimated_minutes=pdv.visit_minutes_estimated,
                distance_from_prev_km=Decimal("0.000"),
            )

        self.stdout.write(
            f"  ✅ Ruta HOY ({hoy}) creada — {len(lista_pdvs)} paradas, "
            f"status=pending (lista para optimizar)"
        )

    def _crear_historico(self, rep, pdvs, dias=5):
        """Crea rutas completadas para los últimos `dias` días hábiles."""
        visitas_creadas = []
        lista_pdvs = list(pdvs.values())

        for delta in range(dias, 0, -1):
            fecha = date.today() - timedelta(days=delta)
            # Saltar domingos
            if fecha.weekday() == 6:
                continue

            ruta, created = Route.objects.get_or_create(
                replenisher=rep,
                route_date=fecha,
                defaults={"status": "pending", "total_pdvs": len(lista_pdvs)},
            )

            total_dist = Decimal("0")
            total_real_min = 0
            stops_del_dia = []

            for orden, pdv in enumerate(lista_pdvs, start=1):
                stop, _ = RouteStop.objects.get_or_create(
                    route=ruta,
                    pdv=pdv,
                    defaults={
                        "stop_order": orden,
                        "estimated_minutes": pdv.visit_minutes_estimated,
                        "distance_from_prev_km": Decimal(str(round(random.uniform(0.3, 2.5), 3))),
                        "status": "completed",
                    },
                )
                stops_del_dia.append(stop)

                # Tiempo real: mayoristas tardan más, minoristas son más precisos
                if pdv.client_type.category == "MAYORISTA":
                    real_min = pdv.visit_minutes_estimated + random.randint(5, 18)
                else:
                    real_min = pdv.visit_minutes_estimated + random.randint(-5, 8)
                real_min = max(real_min, 10)

                inicio = datetime.combine(
                    fecha,
                    datetime.min.time().replace(hour=8 + orden),
                ).replace(tzinfo=timezone.utc)
                fin = inicio + timedelta(minutes=real_min)

                if not stop.arrived_at:
                    stop.arrived_at = inicio
                    stop.finished_at = fin
                    stop.real_minutes = real_min
                    stop.arrival_location = Point(
                        pdv.location.x + random.uniform(-0.0002, 0.0002),
                        pdv.location.y + random.uniform(-0.0002, 0.0002),
                        srid=4326,
                    )
                    stop.distance_to_pdv_m = round(random.uniform(5, 45), 1)
                    stop.save()

                total_dist += stop.distance_from_prev_km
                total_real_min += real_min

                # Visita asociada
                visita, v_created = Visit.objects.get_or_create(
                    route_stop=stop,
                    pdv=pdv,
                    replenisher=rep,
                    defaults={
                        "visit_date": fecha,
                        "status": "completed",
                        "finished_at": fin,
                        "estimated_minutes": pdv.visit_minutes_estimated,
                        "notes": self._nota_visita(pdv),
                    },
                )
                if v_created:
                    # auto_now_add no se puede sobreescribir en create;
                    # update() hace un SQL directo que sí lo permite.
                    Visit.objects.filter(id=visita.id).update(started_at=inicio)
                    visita.started_at = inicio
                    visitas_creadas.append(visita)

                    # Formulario de evidencia
                    FormularioDinamico.objects.create(
                        visit=visita,
                        tipo_formulario="Tarea_En_Proceso",
                        datos_extra={
                            "productos_repuestos": random.randint(3, 12),
                            "facing_ok": random.choice([True, True, True, False]),
                            "gondola_limpia": random.choice([True, True, False]),
                            "precio_ok": True,
                        },
                        notas=f"Visita completada. {self._nota_visita(pdv)}",
                        foto_url=f"https://drive.google.com/file/d/demo-{stop.id}/view",
                    )

            # Cerrar la ruta del día
            ruta.status = "completed"
            ruta.total_distance_km = total_dist
            ruta.total_real_minutes = total_real_min
            ruta.total_estimated_minutes = sum(p.visit_minutes_estimated for p in lista_pdvs)
            ruta.started_at = datetime.combine(fecha, datetime.min.time().replace(hour=8)).replace(tzinfo=timezone.utc)
            ruta.finished_at = datetime.combine(fecha, datetime.min.time().replace(hour=8 + len(lista_pdvs) + 1)).replace(tzinfo=timezone.utc)
            ruta.save()

            desviacion = total_real_min - ruta.total_estimated_minutes
            self.stdout.write(
                f"  ✅ Histórico {fecha} — {len(lista_pdvs)} visitas | "
                f"estimado={ruta.total_estimated_minutes}min | "
                f"real={total_real_min}min | "
                f"desviación={'+' if desviacion >= 0 else ''}{desviacion}min"
            )

        return visitas_creadas

    def _crear_restock_requests(self, rep, pdvs, visitas):
        lista_pdvs = list(pdvs.values())
        visita_ref = visitas[0] if visitas else None

        solicitudes = [
            {
                "pdv": lista_pdvs[0],           # SC001 MAYORISTA
                "product_name": "Salsa de Tomate Venado 390g",
                "quantity_requested": 48,
                "urgency": "critical",
                "status": "pending",
                "notes": "Quiebre total de stock. Gondola vacía hace 2 días. "
                         "Cliente amenaza con cambiar de proveedor.",
            },
            {
                "pdv": lista_pdvs[1],           # SC002 MAYORISTA
                "product_name": "Caldito Venado x12",
                "quantity_requested": 24,
                "urgency": "high",
                "status": "approved",
                "notes": "Stock crítico, menos de 5 unidades. Solicitar entrega urgente.",
            },
            {
                "pdv": lista_pdvs[2],           # SC003 MINORISTA
                "product_name": "Levadura Venado 11g x10",
                "quantity_requested": 10,
                "urgency": "medium",
                "status": "pending",
                "notes": "Reposición normal. Rotación alta los jueves (día de pan).",
            },
            {
                "pdv": lista_pdvs[3],           # SC004 MINORISTA
                "product_name": "Vinagre Venado 1L",
                "quantity_requested": 6,
                "urgency": "low",
                "status": "fulfilled",
                "notes": "Ya fue repuesto en visita del martes. Registro para trazabilidad.",
            },
        ]

        for s in solicitudes:
            _, created = RestockRequest.objects.get_or_create(
                pdv=s["pdv"],
                product_name=s["product_name"],
                replenisher=rep,
                defaults={
                    "visit": visita_ref,
                    "quantity_requested": s["quantity_requested"],
                    "urgency": s["urgency"],
                    "status": s["status"],
                    "notes": s["notes"],
                },
            )
            icono = {"critical": "🚨", "high": "🔴", "medium": "🟡", "low": "🟢"}[s["urgency"]]
            self.stdout.write(
                f"  {'✅' if created else '↩'} {icono} Restock [{s['urgency'].upper()}] "
                f"{s['product_name']} → {s['pdv'].code} ({s['status']})"
            )

    def _crear_product_issues(self, rep, pdvs, visitas):
        lista_pdvs = list(pdvs.values())
        visita_ref = visitas[1] if len(visitas) > 1 else None

        issues = [
            {
                "pdv": lista_pdvs[0],
                "product_name": "Mayonesa Venado 500g",
                "quantity": 3,
                "reason": "expired",
                "notes": "Lote vencido en noviembre. Retirado de góndola.",
            },
            {
                "pdv": lista_pdvs[2],
                "product_name": "Sal Fina Venado 1kg",
                "quantity": 2,
                "reason": "damaged",
                "notes": "Bolsas rotas por humedad. Se solicitó cambio al supervisor.",
            },
        ]

        for i in issues:
            _, created = ProductIssue.objects.get_or_create(
                pdv=i["pdv"],
                product_name=i["product_name"],
                replenisher=rep,
                defaults={
                    "visit": visita_ref,
                    "quantity": i["quantity"],
                    "reason": i["reason"],
                    "notes": i["notes"],
                },
            )
            self.stdout.write(
                f"  {'✅' if created else '↩'} ⚠️  ProductIssue [{i['reason']}] "
                f"{i['product_name']} × {i['quantity']} → {i['pdv'].code}"
            )

    # ──────────────────────────────────────────────────────────────────────────
    # Helpers
    # ──────────────────────────────────────────────────────────────────────────

    @staticmethod
    def _nota_visita(pdv):
        notas_mayor = [
            "Góndola en orden, bandeo renovado.",
            "Stock controlado. POP colocado correctamente.",
            "Cliente solicitó más producto la próxima semana.",
            "Limpieza completa de espacio. Sin vencidos.",
        ]
        notas_menor = [
            "Reposición completa. Sin incidencias.",
            "Estantería limpia y ordenada.",
            "Producto fronteado correctamente.",
            "Rotación FIFO aplicada.",
        ]
        pool = notas_mayor if pdv.client_type.category == "MAYORISTA" else notas_menor
        return random.choice(pool)

    def _imprimir_resumen(self, rep, pdvs):
        from apps.logistica.models import Route, RouteStop, Visit, RestockRequest, ProductIssue  # noqa: F811

        rutas = Route.objects.filter(replenisher=rep)
        visitas = Visit.objects.filter(replenisher=rep, status="completed")
        completadas = rutas.filter(status="completed")
        hoy_ruta = rutas.filter(status="pending").first()

        # Desviación calculada desde RouteStop (real_minutes vs estimated_minutes)
        # porque Visit.started_at tiene auto_now_add y no es confiable para el cálculo.
        stops_hist = RouteStop.objects.filter(
            route__replenisher=rep, status="completed", real_minutes__isnull=False
        )
        if stops_hist.exists():
            avg_dev = sum(
                s.real_minutes - s.estimated_minutes for s in stops_hist
            ) / stops_hist.count()
        else:
            avg_dev = 0

        self.stdout.write("")
        self.stdout.write(self.style.SUCCESS("─" * 52))
        self.stdout.write(self.style.SUCCESS("  RESUMEN DE DATOS GENERADOS"))
        self.stdout.write(self.style.SUCCESS("─" * 52))
        self.stdout.write(f"  Reponedor SC : reponedor_sc / reposc123")
        self.stdout.write(f"  PDVs creados : {len(pdvs)} (2 MAYORISTA + 2 MINORISTA)")
        self.stdout.write(f"  Mercados     : {', '.join(pdvs.keys())}")
        self.stdout.write(f"  Rutas hist.  : {completadas.count()} días completados")
        self.stdout.write(f"  Visitas OK   : {visitas.count()}")
        self.stdout.write(f"  Desv. prom.  : {avg_dev:+.1f} min (real vs estimado)")
        self.stdout.write(f"  Restock req. : {RestockRequest.objects.filter(replenisher=rep).count()} (🚨 critical → 🟢 low)")
        self.stdout.write(f"  ProductIssues: {ProductIssue.objects.filter(replenisher=rep).count()}")
        self.stdout.write(f"  Ruta HOY     : {'pending — POST /rutas/' + str(hoy_ruta.id) + '/iniciar/' if hoy_ruta else 'no creada'}")
        self.stdout.write(self.style.SUCCESS("─" * 52))
