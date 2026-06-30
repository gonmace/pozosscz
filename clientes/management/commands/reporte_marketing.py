"""
Reporte de marketing para PozosSCZ.

Convierte los datos que ya guarda el modelo Cliente en las respuestas que el plan
de marketing marca como decisión pendiente #1: ticket promedio (ARPC), desglose
por canal de origen y tasa de cierre del embudo.

Uso:
    python manage.py reporte_marketing --settings=config.dev
    python manage.py reporte_marketing --meses 6 --settings=config.dev
    python manage.py reporte_marketing --desde 2026-01-01 --hasta 2026-06-30 --settings=config.dev

Notas:
- El precio está en Bolivianos (campo `cost` = precio final cobrado).
- "Ejecutado" (status EJE) = trabajo realmente realizado; sobre esos se calcula el ARPC.
- El CPL (costo por cotización de Facebook) NO sale de la base: necesitás el gasto de
  Meta Ads. El reporte te da las cotizaciones atribuidas a FB Ads por mes para que
  hagas: CPL = gasto_mensual_FB / cotizaciones_FBA_del_mes.
"""

from datetime import datetime, timedelta

from django.core.management.base import BaseCommand, CommandError
from django.db.models import Count, Sum, Avg, Min, Max
from django.db.models.functions import TruncMonth
from django.utils import timezone

from clientes.models import Cliente, ESTADO_CLIENTE_CHOICES, TIPO_SERVICIO_CHOICES

ESTADOS = dict(ESTADO_CLIENTE_CHOICES)
CANALES = dict(TIPO_SERVICIO_CHOICES)


def bs(valor):
    """Formatea un entero como Bolivianos con separador de miles."""
    return f"Bs {valor:,.0f}".replace(",", ".")


def pct(parte, total):
    return f"{(parte / total * 100):.0f}%" if total else "—"


class Command(BaseCommand):
    help = "Reporte de marketing: ARPC, desglose por canal y tasa de cierre del embudo."

    def add_arguments(self, parser):
        parser.add_argument(
            "--meses", type=int, default=12,
            help="Cantidad de meses hacia atrás a analizar (por defecto 12). Se ignora si usás --desde.",
        )
        parser.add_argument("--desde", type=str, help="Fecha inicio YYYY-MM-DD (opcional).")
        parser.add_argument("--hasta", type=str, help="Fecha fin YYYY-MM-DD (opcional, por defecto hoy).")

    def handle(self, *args, **opts):
        desde, hasta = self._rango_fechas(opts)
        qs = Cliente.objects.filter(created_at__gte=desde, created_at__lte=hasta)

        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING("══════════════════════════════════════════════════"))
        self.stdout.write(self.style.MIGRATE_HEADING("  REPORTE DE MARKETING — PozosSCZ"))
        self.stdout.write(self.style.MIGRATE_HEADING("══════════════════════════════════════════════════"))
        self.stdout.write(
            f"  Periodo: {desde.date()} → {hasta.date()}  "
            f"({(hasta - desde).days} días)"
        )
        self.stdout.write("")

        total = qs.count()
        if not total:
            self.stdout.write(self.style.WARNING("  No hay clientes registrados en este periodo."))
            return

        self._embudo(qs, total)
        self._ticket(qs)
        self._por_canal(qs)
        self._tendencia_mensual(qs)
        self._pista_cpl(qs, desde, hasta)
        self.stdout.write("")

    # ── helpers ────────────────────────────────────────────────────────────

    def _rango_fechas(self, opts):
        ahora = timezone.now()
        hasta = ahora
        if opts.get("hasta"):
            try:
                hasta = timezone.make_aware(datetime.strptime(opts["hasta"], "%Y-%m-%d")) + timedelta(days=1)
            except ValueError:
                raise CommandError("--hasta debe tener formato YYYY-MM-DD")
        if opts.get("desde"):
            try:
                desde = timezone.make_aware(datetime.strptime(opts["desde"], "%Y-%m-%d"))
            except ValueError:
                raise CommandError("--desde debe tener formato YYYY-MM-DD")
        else:
            desde = hasta - timedelta(days=30 * opts["meses"])
        return desde, hasta

    def _embudo(self, qs, total):
        self.stdout.write(self.style.HTTP_INFO("EMBUDO (clientes registrados en el periodo)"))
        conteos = {row["status"]: row["n"] for row in qs.values("status").annotate(n=Count("id"))}
        for code, label in ESTADO_CLIENTE_CHOICES:
            n = conteos.get(code, 0)
            self.stdout.write(f"  {label:<16} {n:>6}   {pct(n, total)}")
        self.stdout.write(f"  {'TOTAL':<16} {total:>6}")

        ejecutados = conteos.get("EJE", 0)
        # Base de cierre: todo lo que entró al embudo comercial (excluye lista negra).
        base_cierre = sum(conteos.get(c, 0) for c in ("COT", "PRG", "EJE", "CAN"))
        self.stdout.write(
            f"  → Tasa de cierre (Ejecutado / cotizaciones reales): "
            + self.style.SUCCESS(pct(ejecutados, base_cierre))
        )
        self.stdout.write("")

    def _ticket(self, qs):
        self.stdout.write(self.style.HTTP_INFO("TICKET PROMEDIO — trabajos ejecutados con precio > 0"))
        eje = qs.filter(status="EJE", cost__gt=0)
        agg = eje.aggregate(n=Count("id"), total=Sum("cost"), prom=Avg("cost"),
                            minimo=Min("cost"), maximo=Max("cost"))
        n = agg["n"] or 0
        if not n:
            self.stdout.write(self.style.WARNING(
                "  Sin trabajos ejecutados con precio cargado. "
                "Cargá el campo 'precio final' (cost) al cerrar cada trabajo."))
            self.stdout.write("")
            return
        costos = sorted(eje.values_list("cost", flat=True))
        mediana = costos[n // 2] if n % 2 else (costos[n // 2 - 1] + costos[n // 2]) // 2
        self.stdout.write(f"  Trabajos con precio:      {n:>8}")
        self.stdout.write(f"  Ingreso total:            {bs(agg['total']):>12}")
        self.stdout.write(f"  Ticket promedio (ARPC):   " + self.style.SUCCESS(f"{bs(agg['prom']):>12}"))
        self.stdout.write(f"  Ticket mediano:           {bs(mediana):>12}")
        self.stdout.write(f"  Mínimo / Máximo:          {bs(agg['minimo'])} / {bs(agg['maximo'])}")
        self.stdout.write("")

    def _por_canal(self, qs):
        self.stdout.write(self.style.HTTP_INFO("POR CANAL DE ORIGEN — trabajos ejecutados"))
        filas = (qs.filter(status="EJE")
                   .values("service")
                   .annotate(n=Count("id"), ingreso=Sum("cost"))
                   .order_by("-ingreso"))
        if not filas:
            self.stdout.write(self.style.WARNING("  Sin trabajos ejecutados en el periodo."))
            self.stdout.write("")
            return
        ingreso_total = sum(f["ingreso"] or 0 for f in filas) or 1
        self.stdout.write(f"  {'Canal':<16}{'Trab.':>7}{'Ingreso':>14}{'Ticket':>11}{'% ing.':>8}")
        self.stdout.write(f"  {'-'*54}")
        for f in filas:
            ingreso = f["ingreso"] or 0
            ticket = ingreso // f["n"] if f["n"] else 0
            label = CANALES.get(f["service"], f["service"])
            self.stdout.write(
                f"  {label:<16}{f['n']:>7}{bs(ingreso):>14}{bs(ticket):>11}{pct(ingreso, ingreso_total):>8}"
            )
        self.stdout.write("")

    def _tendencia_mensual(self, qs):
        self.stdout.write(self.style.HTTP_INFO("TENDENCIA MENSUAL — trabajos ejecutados"))
        filas = (qs.filter(status="EJE")
                   .annotate(mes=TruncMonth("created_at"))
                   .values("mes")
                   .annotate(n=Count("id"), ingreso=Sum("cost"))
                   .order_by("mes"))
        if not filas:
            self.stdout.write(self.style.WARNING("  Sin datos."))
            self.stdout.write("")
            return
        for f in filas:
            mes = f["mes"].strftime("%Y-%m")
            self.stdout.write(f"  {mes}   {f['n']:>4} trabajos   {bs(f['ingreso'] or 0):>12}")
        self.stdout.write("")

    def _pista_cpl(self, qs, desde, hasta):
        """Cotizaciones atribuidas a FB Ads por mes → base para calcular el CPL."""
        filas = (qs.filter(service="FBA")
                   .annotate(mes=TruncMonth("created_at"))
                   .values("mes")
                   .annotate(n=Count("id"))
                   .order_by("mes"))
        if not filas:
            return
        self.stdout.write(self.style.HTTP_INFO("CPL DE FACEBOOK — cotizaciones atribuidas a FB Ads por mes"))
        self.stdout.write("  (CPL = tu gasto mensual de Meta Ads ÷ estas cotizaciones)")
        for f in filas:
            mes = f["mes"].strftime("%Y-%m")
            self.stdout.write(f"  {mes}   {f['n']:>4} cotizaciones FB Ads")
        self.stdout.write("")
