from django.contrib.auth.models import User
from django.db import models
from django.db.models.signals import pre_save, post_save
from django.dispatch import receiver
from django.utils import timezone


class Camion(models.Model):
    usuario = models.OneToOneField(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='camion',
        verbose_name='Usuario chofer',
    )
    operador = models.CharField('Nombre del operador', max_length=100)
    marca = models.CharField('Camión (marca/modelo)', max_length=100)
    capacidad = models.IntegerField('Capacidad (litros)', default=18000)
    created_at = models.DateTimeField(auto_now_add=True)

    # Última posición conocida — se actualiza automáticamente vía signal en RegistroCamion.
    lat = models.FloatField('Última latitud', null=True, blank=True)
    lon = models.FloatField('Último longitud', null=True, blank=True)
    activo = models.BooleanField('En servicio', default=False)
    ultima_actualizacion = models.DateTimeField('Última actualización', null=True, blank=True)

    # Configuración de tracking — editable desde el admin
    tracking_activo = models.BooleanField(
        'Tracking activo',
        default=True,
        help_text='Si está desactivado, el chofer no puede enviar ubicación',
    )
    intervalo_tracking = models.PositiveIntegerField(
        'Intervalo de tracking (seg)',
        default=30,
        help_text='Cada cuántos segundos el teléfono envía su ubicación (mínimo 10)',
    )

    def __str__(self):
        return f'{self.marca} — {self.operador}'

    class Meta:
        db_table = 'pozosscz_camion'
        verbose_name = 'Camión'
        verbose_name_plural = 'Camiones'
        ordering = ['operador']


class RegistroCamion(models.Model):
    camion = models.ForeignKey(
        Camion,
        on_delete=models.CASCADE,
        related_name='estados',
        verbose_name='Camión',
    )
    activo = models.BooleanField('En servicio', default=False)
    lat = models.FloatField('Latitud')
    lon = models.FloatField('Longitud')
    velocidad = models.FloatField('Velocidad (km/h)', default=0)
    direccion = models.FloatField('Dirección (°)', default=0,
        help_text='0=Norte, 90=Este, 180=Sur, 270=Oeste')
    comentario = models.CharField('Comentario', max_length=200, blank=True, default='')
    registrado_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.camion} — {self.registrado_at:%d/%m/%Y %H:%M}'

    class Meta:
        db_table = 'pozosscz_estadocamion'
        verbose_name = 'Registro de Camión'
        verbose_name_plural = 'Registros de Camión'
        ordering = ['-registrado_at']
        indexes = [
            models.Index(fields=['camion', 'registrado_at']),
        ]


TIPO_EVENTO_CHOICES = [
    ('SRV_EJE', 'Servicio ejecutado'),       # PRG → EJE
    ('SRV_CAN', 'Servicio cancelado'),        # PRG → CAN
    ('TKQ_VAC', 'Tanque vacío'),               # nivel_tanque → 0.0
    ('TKQ_UPD', 'Nivel tanque actualizado'),  # corrección manual
    ('TKQ_LLE', 'Tanque lleno'),              # nivel_tanque → 1.0
    ('DSL_CAR', 'Diesel cargado'),            # recarga de combustible
    ('TRK_ACT', 'Activado'),
    ('TRK_DES', 'Desactivado'),
]


class EventoCamion(models.Model):
    camion = models.ForeignKey(
        Camion,
        on_delete=models.CASCADE,
        related_name='eventos',
        verbose_name='Camión',
    )
    cliente = models.ForeignKey(
        'clientes.Cliente',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='eventos',
        verbose_name='Cliente (servicio)',
    )
    tipo = models.CharField('Tipo de evento', max_length=7, choices=TIPO_EVENTO_CHOICES)
    lat = models.FloatField('Latitud')
    lon = models.FloatField('Longitud')
    comentario = models.CharField('Comentario', max_length=300, blank=True, default='')
    nivel_tanque = models.FloatField('Nivel tanque', null=True, blank=True)
    monto = models.IntegerField('Monto', null=True, blank=True)
    factura = models.IntegerField('Factura', null=True, blank=True,
        help_text='Monto facturado (monto − 16%); vacío hasta que se confirme manualmente')
    qr = models.BooleanField('QR', default=True)
    registrado_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f'{self.camion} — {self.get_tipo_display()} — {self.registrado_at:%d/%m/%Y %H:%M}'

    class Meta:
        db_table = 'pozosscz_eventocamion'
        verbose_name = 'Evento de Camión'
        verbose_name_plural = 'Eventos de Camión'
        ordering = ['-registrado_at']
        indexes = [
            models.Index(fields=['camion', 'registrado_at']),
            models.Index(fields=['tipo', 'registrado_at']),
        ]


class DispositivoFCM(models.Model):
    usuario = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='dispositivos',
        verbose_name='Usuario',
    )
    fcm_token = models.TextField('Token FCM', unique=True)
    activo = models.BooleanField('Activo', default=True)
    registrado_at = models.DateTimeField('Última actualización', auto_now=True)

    def __str__(self):
        return f'{self.usuario.username} — {self.fcm_token[:20]}...'

    class Meta:
        db_table = 'pozosscz_dispositivofcm'
        verbose_name = 'Dispositivo FCM'
        verbose_name_plural = 'Dispositivos FCM'


class PanelChoferes(Camion):
    '''Proxy para mostrar el panel operativo de choferes en el admin de flota.'''

    class Meta:
        proxy = True
        verbose_name = 'Panel de Choferes'
        verbose_name_plural = 'Panel de Choferes'
        app_label = 'flota'


# ── Signals ──────────────────────────────────────────────────────────────────

@receiver(pre_save, sender=Camion)
def _capturar_config_previa(sender, instance, **kwargs):
    '''Guarda los valores anteriores en el objeto para compararlos en post_save.'''
    if not instance.pk:
        instance._config_anterior = None
        return
    try:
        anterior = Camion.objects.get(pk=instance.pk)
        instance._config_anterior = (anterior.tracking_activo, anterior.intervalo_tracking)
    except Camion.DoesNotExist:
        instance._config_anterior = None


@receiver(post_save, sender=Camion)
def enviar_config_al_guardar(sender, instance, created, **kwargs):
    '''Envía config de tracking al teléfono solo si tracking_activo o intervalo cambiaron.'''
    if created or not instance.usuario_id:
        return
    anterior = getattr(instance, '_config_anterior', None)
    actual = (instance.tracking_activo, instance.intervalo_tracking)
    if anterior == actual:
        return  # Sin cambios — no enviar FCM innecesario
    from pozosscz.servicios_fcm import enviar_config_tracking
    enviar_config_tracking(
        usuario_id=instance.usuario_id,
        tracking_activo=instance.tracking_activo,
        intervalo=instance.intervalo_tracking,
    )


@receiver(post_save, sender=RegistroCamion)
def actualizar_posicion_camion(sender, instance, created, **kwargs):
    if created:
        Camion.objects.filter(pk=instance.camion_id).update(
            lat=instance.lat,
            lon=instance.lon,
            activo=instance.activo,
            ultima_actualizacion=timezone.now(),
        )
        # Notificar al SSE endpoint que hay datos nuevos
        from django.core.cache import cache
        try:
            cache.incr('camiones_version')
        except ValueError:
            cache.set('camiones_version', 1, timeout=None)


@receiver(post_save, sender=EventoCamion)
def notificar_evento_camion(sender, instance, created, **kwargs):
    if created:
        from django.core.cache import cache
        try:
            cache.incr('camiones_version')
        except ValueError:
            cache.set('camiones_version', 1, timeout=None)
