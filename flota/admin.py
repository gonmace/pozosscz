import json
import time

from django.contrib import admin
from django.core.cache import cache
from django.http import JsonResponse, StreamingHttpResponse
from django.urls import path
from django.utils.timezone import localtime, now
from django.utils.html import format_html

from .models import Camion, RegistroCamion, DispositivoFCM, PanelChoferes, EventoCamion


# ---------------------------------------------------------------------------
# Camion
# ---------------------------------------------------------------------------

@admin.register(Camion)
class CamionAdmin(admin.ModelAdmin):
    list_display = ('operador', 'marca', 'capacidad', 'tracking_activo', 'intervalo_tracking')
    list_editable = ('tracking_activo', 'intervalo_tracking')
    list_display_links = ('operador',)


# ---------------------------------------------------------------------------
# Estado de Camión
# ---------------------------------------------------------------------------

@admin.register(RegistroCamion)
class RegistroCamionAdmin(admin.ModelAdmin):
    list_display = ('camion', 'activo', 'lat', 'lon', 'velocidad', 'direccion', 'fecha_hora')
    list_filter = ('activo', 'camion')
    readonly_fields = ('registrado_at',)
    ordering = ('-registrado_at',)
    date_hierarchy = 'registrado_at'

    @admin.display(description='Fecha y hora', ordering='registrado_at')
    def fecha_hora(self, obj):
        return localtime(obj.registrado_at).strftime('%d/%m/%Y %H:%M:%S')


# ---------------------------------------------------------------------------
# Panel operativo de choferes
# ---------------------------------------------------------------------------

def _hace_cuanto(dt):
    if dt is None:
        return '—'
    delta = now() - dt
    segundos = int(delta.total_seconds())
    if segundos < 60:
        return f'hace {segundos}s'
    if segundos < 3600:
        return f'hace {segundos // 60}m'
    return f'hace {segundos // 3600}h {(segundos % 3600) // 60}m'


RUMBOS = [
    (22.5,  'N'), (67.5,  'NE'), (112.5, 'E'),  (157.5, 'SE'),
    (202.5, 'S'), (247.5, 'SO'), (292.5, 'O'),  (337.5, 'NO'), (360, 'N'),
]


def _direccion_texto(grados):
    if grados is None:
        return ''
    for limite, nombre in RUMBOS:
        if grados <= limite:
            return nombre
    return 'N'


@admin.register(PanelChoferes)
class PanelChoferesAdmin(admin.ModelAdmin):
    """Vista de panel; no expone lista/detalle estándar."""

    def has_add_permission(self, request):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def changelist_view(self, request, extra_context=None):
        from django.db.models import Subquery, OuterRef, FloatField

        ids_con_dispositivo = set(
            DispositivoFCM.objects.filter(activo=True).values_list('usuario_id', flat=True)
        )

        ultimo_estado = RegistroCamion.objects.filter(
            camion=OuterRef('pk')
        ).order_by('-registrado_at')

        camiones = Camion.objects.select_related('usuario').annotate(
            vel=Subquery(ultimo_estado.values('velocidad')[:1], output_field=FloatField()),
            dir=Subquery(ultimo_estado.values('direccion')[:1], output_field=FloatField()),
        )

        choferes = []
        for c in camiones:
            choferes.append({
                'id': c.pk,
                'operador': c.operador,
                'marca': c.marca or '',
                'tracking_activo': c.tracking_activo,
                'intervalo_tracking': c.intervalo_tracking,
                'activo': c.activo,
                'lat': c.lat,
                'lon': c.lon,
                'ultima_actualizacion': c.ultima_actualizacion,
                'ultima_actualizacion_local': (
                    localtime(c.ultima_actualizacion).strftime('%d/%m %H:%M:%S')
                    if c.ultima_actualizacion else None
                ),
                'hace_cuanto': _hace_cuanto(c.ultima_actualizacion),
                'velocidad': round(c.vel, 1) if c.vel is not None else None,
                'direccion_texto': _direccion_texto(c.dir),
                'tiene_dispositivo': c.usuario_id in ids_con_dispositivo if c.usuario_id else False,
                'usuario_id': c.usuario_id,
            })

        choferes.sort(key=lambda x: (not x['tiene_dispositivo'], x['operador']))

        context = {
            **self.admin_site.each_context(request),
            'choferes': choferes,
            'title': 'Panel de Choferes',
            'opts': self.model._meta,
            **(extra_context or {}),
        }
        from django.template.response import TemplateResponse
        return TemplateResponse(
            request,
            'admin/flota/panelchoferes/change_list.html',
            context,
        )


# ---------------------------------------------------------------------------
# Eventos de Camión
# ---------------------------------------------------------------------------

@admin.register(EventoCamion)
class EventoCamionAdmin(admin.ModelAdmin):
    list_display = ('camion', 'tipo', 'nivel_tanque_display', 'diesel_bs', 'factura', 'qr', 'cliente', 'comentario', 'lat', 'lon', 'fecha_hora')
    list_filter = ('tipo', 'camion', 'qr')
    readonly_fields = ('registrado_at',)
    ordering = ('-registrado_at',)
    date_hierarchy = 'registrado_at'

    def get_urls(self):
        custom = [
            path(
                'toggle-tracking/<int:camion_id>/',
                self.admin_site.admin_view(self._toggle_tracking),
                name='flota_eventocamion_toggle_tracking',
            ),
            path(
                'tracking-sse/<int:camion_id>/',
                self.admin_site.admin_view(self._tracking_sse),
                name='flota_eventocamion_tracking_sse',
            ),
        ]
        return custom + super().get_urls()

    def _toggle_tracking(self, request, camion_id):
        if request.method != 'POST':
            return JsonResponse({'error': 'POST requerido'}, status=405)
        try:
            camion = Camion.objects.get(pk=camion_id)
        except Camion.DoesNotExist:
            return JsonResponse({'error': 'Camión no encontrado'}, status=404)
        camion.tracking_activo = not camion.tracking_activo
        camion.save()
        try:
            cache.incr(f'tracking_v_{camion_id}')
        except ValueError:
            cache.set(f'tracking_v_{camion_id}', 1, timeout=None)
        return JsonResponse({'tracking_activo': camion.tracking_activo, 'operador': camion.operador})

    def _tracking_sse(self, request, camion_id):
        def stream():
            try:
                camion = Camion.objects.only('tracking_activo').get(pk=camion_id)
            except Camion.DoesNotExist:
                return
            last_v = cache.get(f'tracking_v_{camion_id}', 0)
            yield f'data: {json.dumps({"tracking_activo": camion.tracking_activo})}\n\n'
            ticks = 0
            while True:
                time.sleep(2)
                cur_v = cache.get(f'tracking_v_{camion_id}', 0)
                if cur_v != last_v:
                    last_v = cur_v
                    ticks = 0
                    try:
                        camion = Camion.objects.only('tracking_activo').get(pk=camion_id)
                        yield f'data: {json.dumps({"tracking_activo": camion.tracking_activo})}\n\n'
                    except Camion.DoesNotExist:
                        break
                else:
                    ticks += 1
                    if ticks >= 8:   # ping cada ~16s para mantener la conexión viva
                        ticks = 0
                        yield ': ping\n\n'

        resp = StreamingHttpResponse(stream(), content_type='text/event-stream')
        resp['Cache-Control'] = 'no-cache'
        resp['X-Accel-Buffering'] = 'no'
        return resp

    def _camiones_tracking(self):
        return {str(c.pk): c.tracking_activo for c in Camion.objects.all()}

    def add_view(self, request, form_url='', extra_context=None):
        extra_context = extra_context or {}
        extra_context['camiones_tracking_json'] = json.dumps(self._camiones_tracking())
        return super().add_view(request, form_url, extra_context)

    def change_view(self, request, object_id, form_url='', extra_context=None):
        extra_context = extra_context or {}
        extra_context['camiones_tracking_json'] = json.dumps(self._camiones_tracking())
        return super().change_view(request, object_id, form_url, extra_context)

    @admin.display(description='Tanque', ordering='nivel_tanque')
    def nivel_tanque_display(self, obj):
        if obj.nivel_tanque is None:
            return '—'
        return f'{obj.nivel_tanque:.2f}'

    @admin.display(description='(Bs.)', ordering='monto')
    def diesel_bs(self, obj):
        if obj.monto is None:
            return '—'
        return obj.monto

    @admin.display(description='Fecha y hora', ordering='registrado_at')
    def fecha_hora(self, obj):
        return localtime(obj.registrado_at).strftime('%d/%m/%Y %H:%M:%S')


# ---------------------------------------------------------------------------
# Dispositivos FCM
# ---------------------------------------------------------------------------

@admin.register(DispositivoFCM)
class DispositivoFCMAdmin(admin.ModelAdmin):
    list_display = ('usuario', 'fcm_token_corto', 'activo', 'registrado_at')
    list_filter = ('activo',)
    readonly_fields = ('registrado_at',)
    ordering = ('-registrado_at',)

    def fcm_token_corto(self, obj):
        return format_html(
            '<span title="{}">{}&hellip;</span>',
            obj.fcm_token,
            obj.fcm_token[:35],
        )
    fcm_token_corto.short_description = 'Token FCM'
