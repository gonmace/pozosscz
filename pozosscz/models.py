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
    my_order = models.PositiveIntegerField(
        default=0,
        blank=False,
        null=False,
    )

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['my_order']


def default_img_alt():
    return datetime.now().strftime('%d-%m-%Y')


class Banner(models.Model):
    svg = models.FileField(
        help_text="svg 1200x600",
        upload_to='banner/',
        validators=[validate_file_extension], blank=True, null=True)
    img = models.FileField(
        help_text="svg 1200x600",
        upload_to='banner/',
        validators=[validate_file_extension], )
    img_alt = models.CharField(
        "alt",
        default=default_img_alt,
        max_length=50, blank=True)
    displayWebp = models.BooleanField("Mostrar Webp", default=True)
    displayBanner = models.BooleanField("Mostrar Banner", default=False)

    class Meta:
        verbose_name = "Banner"
        verbose_name_plural = "Banner"
        ordering = ['displayBanner']

    @property
    def thumbnail_svg(self):
        if self.svg:
            return mark_safe("""<img src="{}"
                             style="background-color: white;"
                             width="250" height="150"
                             />""".format(self.svg.url))
        return "No hay archivo svg"

    @property
    def thumbnail_img(self):
        if self.img:
            return mark_safe("""<img src="{}"
                             width="250" height="150"
                             />""".format(self.img.url))
        return "No hay archivo webp"

    def __str__(self):
        return self.img_alt

# class Alcance(models.Model): # Tabla con nombre Alcance
#     title = models.CharField("titulo", default="", max_length=50)
#     description = models.TextField(
    # "contenido", max_length=250, default="", blank=True)
#     svg = models.FileField(
    # upload_to='icon/', validators=[validate_file_extension],
    # default="", blank=True)
#     display = models.BooleanField(default=False)
#     orden = models.PositiveIntegerField(default=0)

#     class Meta:
#         verbose_name = "Alcance"
#         verbose_name_plural = "Nuestro Alcance"
#         ordering = ['orden']

#     def __str__(self):
#         return self.title

#     @property
#     def thumbnail_preview(self):
#         if self.svg:
# return mark_safe('<img src="{}" width="30" height="30" />'
# .format(self.svg.url))
#         return ""


# class AQuien(models.Model):
#     title = models.CharField("cliente", default="", max_length=50)
#     svg = models.FileField(
    # upload_to='icon/',
    # validators=[validate_file_extension_svg], default="", blank=True)
#     display = models.BooleanField(default=True)
#     orden = models.PositiveIntegerField(
#         default=0,
#         blank=False,
#         null=False,
#         )

#     class Meta:
#         verbose_name = "A quien?"
#         verbose_name_plural = "A quienes?"
#         ordering = ['orden']

#     def __str__(self):
#         return self.title

#     @property
#     def thumbnail_preview(self):
#         if self.svg:
#             return mark_safe(
    # '<img src="{}" width="30" height="30" />'.format(self.svg.url))
#         return ""
