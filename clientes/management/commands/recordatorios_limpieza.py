"""
Recordatorios de re-limpieza para PozosSCZ (la "joya" de retención del plan).

Un pozo séptico se vuelve a llenar en 12-18 meses. Este comando encuentra los
clientes a los que ya se les ejecutó el trabajo hace ese tiempo y arma el link de
WhatsApp listo para reactivarlos — convierte la base de datos en ingreso recurrente
sin gastar en pauta.

Uso:
    python manage.py recordatorios_limpieza --settings=config.dev
    python manage.py recordatorios_limpieza --meses-min 12 --meses-max 24 --settings=config.dev

Por defecto SOLO LISTA (no envía nada). El envío se puede automatizar después
(n8n / WhatsApp API) usando los links que genera este comando.
"""

import re
from datetime import timedelta
from urllib.parse import quote

from django.core.management.base import BaseCommand
from django.utils import timezone

from clientes.models import Cliente

MENSAJE = (
    "Hola {nombre}👋 Somos de PozosSCZ. Ya pasó más de un año desde la última vez "
    "que te limpiamos el pozo. Para evitar que se desborde justo cuando menos "
    "conviene, ¿te paso a cotizar de nuevo? Mismo precio justo de siempre. 🚛"
)


def normalizar_telefono(tel):
    """Devuelve solo dígitos en formato internacional Bolivia (591...) o None."""
    if not tel:
        return None
    digits = re.sub(r"\D", "", tel)
    if not digits:
        return None
    if digits.startswith("591"):
        return digits
    # Celular boliviano local: 8 dígitos empezando en 6 o 7.
    if len(digits) == 8 and digits[0] in "67":
        return "591" + digits
    return digits


def link_whatsapp(tel, mensaje):
    numero = normalizar_telefono(tel)
    if not numero:
        return None
    return f"https://wa.me/{numero}?text={quote(mensaje)}"


class Command(BaseCommand):
    help = "Lista clientes pendientes de re-limpieza y arma sus links de WhatsApp."

    def add_arguments(self, parser):
        parser.add_argument("--meses-min", type=int, default=12,
                            help="Mínimo de meses desde el trabajo (por defecto 12).")
        parser.add_argument("--meses-max", type=int, default=24,
                            help="Máximo de meses desde el trabajo (por defecto 24).")

    def handle(self, *args, **opts):
        ahora = timezone.now()
        tope_reciente = ahora - timedelta(days=30 * opts["meses_min"])
        tope_antiguo = ahora - timedelta(days=30 * opts["meses_max"])

        qs = (Cliente.objects
              .filter(status="EJE", created_at__lte=tope_reciente, created_at__gte=tope_antiguo)
              .order_by("created_at"))

        self.stdout.write("")
        self.stdout.write(self.style.MIGRATE_HEADING(
            "RECORDATORIOS DE RE-LIMPIEZA — PozosSCZ"))
        self.stdout.write(
            f"  Clientes con trabajo ejecutado hace {opts['meses_min']}-{opts['meses_max']} meses"
        )
        self.stdout.write("")

        total = qs.count()
        if not total:
            self.stdout.write(self.style.WARNING(
                "  Ningún cliente entra en la ventana. "
                "Probá ampliar el rango (--meses-min / --meses-max) o esperá a tener historial."))
            return

        enviables = 0
        for c in qs:
            meses = (ahora - c.created_at).days // 30
            nombre = (c.name or "vecino").split()[0]
            mensaje = MENSAJE.format(nombre=nombre)
            link = link_whatsapp(c.tel1, mensaje)
            etiqueta = f"#{c.id} · {c.name or 's/nombre'} · {c.tel1 or 's/teléfono'} · hace {meses} meses"
            if link:
                enviables += 1
                self.stdout.write(self.style.SUCCESS(f"  ✓ {etiqueta}"))
                self.stdout.write(f"    {link}")
            else:
                self.stdout.write(self.style.WARNING(f"  ✗ {etiqueta}  (sin teléfono válido)"))
            self.stdout.write("")

        self.stdout.write(self.style.HTTP_INFO(
            f"  Total: {total} clientes · {enviables} con WhatsApp listo para enviar"))
        self.stdout.write(
            "  Siguiente paso: enviá los links (manual ahora; automatizable con n8n después).")
        self.stdout.write("")
