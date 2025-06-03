from django.contrib import admin

from solo.admin import SingletonModelAdmin
from pozosscz.models import (
    PreciosPozosSCZ,
    DatosGenerales,
    AreasFactor,
    Banner,
    # Alcance,
    # AQuien
)
from adminsortable2.admin import SortableAdminMixin


# @admin.register(AreasFactor)
class AreasFactorAdmin(SortableAdminMixin, admin.ModelAdmin):
    list_display = ['my_order', 'name', 'factor', 'is_main']
    list_editable = ('factor', 'is_main')
    # ordering = ['my_order']

    def save_model(self, request, obj, form, change):
        if obj.is_main:
            # Set all other instances to is_main=False
            AreasFactor.objects.exclude(pk=obj.pk).update(is_main=False)
        super().save_model(request, obj, form, change)


admin.site.register(AreasFactor, AreasFactorAdmin)

admin.site.register(DatosGenerales, SingletonModelAdmin)

admin.site.register(PreciosPozosSCZ, SingletonModelAdmin)


class BannerAdmin(admin.ModelAdmin):
    list_display = (
        'img_alt',
        'displayBanner',
        'thumbnail_img',
        'thumbnail_svg',
        'displayWebp'
    )
    list_editable = ('displayBanner',)


admin.site.register(Banner, BannerAdmin)

# class AlcanceAdmin(SortableAdminMixin, admin.ModelAdmin):
#     list_display = ['orden', 'title', 'thumbnail_preview', 'display']
#     list_editable = ('display', )
# admin.site.register(Alcance, AlcanceAdmin)

# class AQuienAdmin(SortableAdminMixin, admin.ModelAdmin):
#     list_display = ['orden', 'title', 'thumbnail_preview', 'display']
#     list_editable = ('display',)
# admin.site.register(AQuien, AQuienAdmin)
