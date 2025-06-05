from django.db import models
from .validators import validate_file_extension
from django.utils.html import mark_safe
from solo.models import SingletonModel
from datetime import datetime


class DatosGenerales(SingletonModel):
    celular = models.CharField(
        "Teléfono Celular", max_length=12, default="+59171011118"
    )
    mensaje_cotizar = models.TextField(
        "Cotizar",
        default="""¡Hola!, Requiero el servicio de limpieza
         en la siguiente ubicación: """
    )

    def __str__(self):
        return "Datos Generales"

    class Meta:
        verbose_name = "Datos Generales"


class PreciosPozosSCZ(SingletonModel):
    p_km = models.FloatField(
        "Precio km (Bs)", default=7, help_text="Considerar solo de ida"
    )
    p_base = models.IntegerField(
        "Precio minimo base (Bs)",
        default=250,
        help_text="Tarifa minima servicio"
    )
    p_tiempo = models.FloatField(
        "Precio tiempo (Bs)",
        default=5,
        help_text="Considerar el tiempo en llegar al lugar"
    )
    p_factor = models.FloatField(
        "Factor de precio",
        default=1,
        help_text="Factor precio"
    )

    def __str__(self):
        return "Precios Pozos SCZ"

    class Meta:
        verbose_name = "Precios Pozos SCZ"


class AreasFactor(models.Model):
    name = models.CharField("Nombre área", max_length=50)
    factor = models.FloatField("Factor", default=1)
    polygon = models.JSONField()
    is_main = models.BooleanField("Principal", default=False)
    my_order = models.PositiveIntegerField(
        default=0,
        blank=False,
        null=False,
    )

    def __str__(self):
        return self.name

    def save(self, *args, **kwargs):
        if self.is_main:
            # Ensure no other record is marked as main
            AreasFactor.objects.exclude(pk=self.pk).update(is_main=False)
        super().save(*args, **kwargs)

    class Meta:
        ordering = ['my_order']
        verbose_name = "Área y Factor"
        verbose_name_plural = "Áreas y Factores"


def default_img_alt():
    return datetime.now().strftime('%d-%m-%Y')

class BaseCamion(models.Model):
    name = models.CharField("Nombre", max_length=50)
    coordinates = models.JSONField()
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    available = models.BooleanField(default=True)
    deleted = models.BooleanField(default=False)

    def __str__(self):
        return self.name
