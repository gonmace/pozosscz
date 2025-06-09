from django.db import models
from solo.models import SingletonModel
from datetime import datetime


class DatosGenerales(SingletonModel):
    celular = models.CharField(
        "Teléfono Celular", max_length=12, default="+59171011118"
    )
    mensaje_whatsapp = models.TextField(
        "Mensaje para Whatsapp",
        default="""¡Hola!, Requiero el servicio de limpieza en la siguiente ubicación: """
    )
    mensaje_cotizar = models.TextField(
        "Mensaje para Cotizar",
        default="Precio del servicio de limpieza del pozo y cámara séptica para vivienda."
    )    

    def __str__(self):
        return "Datos Generales"

    class Meta:
        verbose_name = "Datos Generales"
        verbose_name_plural = "Datos Generales"
        


class PreciosPozosSCZ(SingletonModel):
    precio_diesel = models.FloatField(
        "Precio Diesel (Bs)",
        default=3.76,
        help_text="Precio del diesel en Bs/L"
    )

    def default_consumo_km():
        return {"vacio": 4, "lleno": 3}

    consumo_diesel_hr = models.FloatField(
        "Consumo Diesel (L/Hr)",
        default=12,
        help_text="Consumo de diesel en L/Hr"
    )
    consumo_diesel_km = models.JSONField(
        "Consumo Diesel (Km/L)",
        default=default_consumo_km,
        help_text="Consumo de diesel en Km/L (camión vacío y lleno)"
    )
    tiempo_trabajo = models.FloatField(
        "Tiempo de trabajo (min)",
        default=30,
        help_text="Tiempo de trabajo en min"
    )
    personal_camion = models.IntegerField(
        "Personal %",
        default=20,
        help_text="Costo de personal en %"
    )

    factor_tiempo = models.FloatField(
        "Factor tiempo (min)",
        default=1.25,
        help_text="Factor tiempo en min"
    )
    costo_saguapac_planta = models.IntegerField(
        "Costo Saguapac Panta",
        default=30,
        help_text="Costo de Saguapac Tratamiento planta en Bs."
    )
    costo_mantenimiento = models.IntegerField(
        "Costo Mantenimiento %",
        default=20,
        help_text="Costo de mantenimiento en Bs."
    )
    
    utilidad_km = models.FloatField(
        "Utilidad Km 50% de ida y 50% retorno",
        default=5,
        help_text="Utilidad en %"
    )
    
    utilidad_base = models.IntegerField(
        "Utilidad base (Bs)",
        default=160,
        help_text="Utilidad base en Bs."
    )
    
    costo_adicional_km_retorno = models.FloatField(
        "Costo adicional Km > 20 km",
        default=1,
        help_text="Costo adicional en Bs/Km."
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
