from django.contrib import admin

from solo.admin import SingletonModelAdmin
from pozosscz.models import (
    BaseCamion,
    PreciosPozosSCZ,
    DatosGenerales,
    AreasFactor,
)
from adminsortable2.admin import SortableAdminMixin


# @admin.register(AreasFactor)
class AreasFactorAdmin(SortableAdminMixin, admin.ModelAdmin):
    list_display = ['my_order', 'name', 'factor', 'is_main']
    list_editable = ('factor', 'is_main')
    # ordering = ['my_order']

    def save_model(self, request, obj, form, change):
        # Guardar primero el objeto para que tenga un pk
        super().save_model(request, obj, form, change)
        
        # Luego, si es principal, actualizar los demás
        if obj.is_main:
            AreasFactor.objects.exclude(pk=obj.pk).update(is_main=False)
admin.site.register(AreasFactor, AreasFactorAdmin)

admin.site.register(DatosGenerales, SingletonModelAdmin)

class BannerAdmin(admin.ModelAdmin):
    list_display = (
        'img_alt',
        'displayBanner',
        'thumbnail_img',
        'thumbnail_svg',
        'displayWebp'
    )
    list_editable = ('displayBanner',)

@admin.register(BaseCamion)
class BaseCamionAdmin(admin.ModelAdmin):
    list_display = ('name', 'available', 'deleted', 'coordinates', 'created_at', 'updated_at')
    list_editable = ('available', 'deleted')
    

@admin.register(PreciosPozosSCZ)
class PreciosPozosSCZAdmin(SingletonModelAdmin):
    list_display = ('precio_diesel', 'consumo_diesel_hr', 'consumo_diesel_km', 'tiempo_trabajo', 'personal_camion', 'factor_tiempo', 'costo_saguapac_planta', 'costo_mantenimiento', 'utilidad_km', 'utilidad_base')
    list_display_links = ('precio_diesel',)
    list_editable = ('consumo_diesel_hr', 'consumo_diesel_km', 'tiempo_trabajo', 'personal_camion', 'factor_tiempo', 'costo_saguapac_planta', 'costo_mantenimiento', 'utilidad_km', 'utilidad_base')