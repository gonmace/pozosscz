from django.db import models

ESTADO_CLIENTE_CHOICES = [
    ('COT', 'Cotizado'),
    ('EJE', 'Ejecutado'),
    ('NEG', 'L.negra'),
]
TIPO_SERVICIO_CHOICES = [
    ('NOR', 'Normal'),
    ('FLE', 'Flete'),
    ('RRP', 'RRPP'),
    ('FBA', 'FB Ads'),
    ('ORG', 'Orgánico'),
    ('GOA', 'Google Ads'),
    ('COM', 'Combo'),
    ('MKP', 'Market Place'),
    ('OTR', 'Otro'),
]

USUARIO_CHOICES = [
    ('ADM', 'Administrador'),
    ('CLC', 'Cliente Confirma'),
    ('CLX', 'Cliente Cancela'),
]


class Cliente(models.Model):
    tel1 = models.CharField("telefono 1", max_length=8, null=True, blank=True)
    tel2 = models.CharField("telefono 2", max_length=12, blank=True)
    name = models.CharField("nombre", max_length=51, blank=True, null=True)
    address = models.CharField("direccion", max_length=120, blank=True)
    cod = models.CharField("codigo", max_length=10, blank=True, null=True)
    cost = models.IntegerField("precio", default=0)
    service = models.CharField(
        "servicio", max_length=10, choices=TIPO_SERVICIO_CHOICES, default='NOR'
    )
    lat = models.FloatField("latitud", max_length=10)
    lon = models.FloatField("longitud", max_length=10)
    status = models.CharField(
        "estado", max_length=3, choices=ESTADO_CLIENTE_CHOICES, default='COT'
    )
    user = models.CharField(
        "usuario", max_length=10, choices=USUARIO_CHOICES, default='ADM'
    )
    created_at = models.DateTimeField("creado", auto_now_add=True)
    updated_at = models.DateField("actualizado",blank=True, null=True)

    def save(self, *args, **kwargs):
        if not self.updated_at:  # Si updated_at no tiene valor
            self.updated_at = self.created_at
        super().save(*args, **kwargs)  # Llamar al método save de la clase base

    class Meta:
        verbose_name = "Cliente"
        verbose_name_plural = "Cientes"

    def __str__(self):
        return self.tel1 if self.tel1 else '--------'
