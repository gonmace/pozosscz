from django.contrib import admin
from django.utils.html import mark_safe
from .models import Banner, Alcance, TipoCliente, Contacto, MetaTag
from adminsortable2.admin import SortableAdminMixin

@admin.register(MetaTag)
class MetaTagAdmin(admin.ModelAdmin):
    list_display = ['slug', 'title', 'description']
    list_editable = ('title', 'description')


@admin.register(Banner)
class BannerAdmin(admin.ModelAdmin):
    list_display = ('img_alt', 'preview_image', 'preview_svg', 'is_active')
    list_display_links = ('img_alt',)
    readonly_fields = ('preview_image', 'preview_svg')
    list_editable = ('is_active',)

    def preview_image(self, obj):
        if obj.img:
            return mark_safe(f'<img src="{obj.img.url}" style="max-height: 50px;"/>')
        return "No image"
    preview_image.short_description = 'Image Preview'

    def preview_svg(self, obj):
        if obj.svg:
            return mark_safe(f'<img src="{obj.svg.url}" style="max-height: 50px;"/>')
        return "No SVG"
    preview_svg.short_description = 'SVG Preview'


@admin.register(Alcance)
class AlcanceAdmin(SortableAdminMixin, admin.ModelAdmin):
    list_display = ('preview_svg', 'is_active', 'titulo' )
    list_display_links = ('preview_svg',)
    readonly_fields = ('preview_svg',)
    list_editable = ('is_active', 'titulo',)

    def preview_svg(self, obj):
        if obj.img_svg:
            return mark_safe(f'<img src="{obj.img_svg.url}" style="height: 50px; background-color: white;"/>')
        return "No SVG"
    
    
@admin.register(TipoCliente)
class TipoClienteAdmin(SortableAdminMixin, admin.ModelAdmin):
    list_display = ('preview_svg', 'nombre', 'is_active')
    list_display_links = ('nombre',)
    readonly_fields = ('preview_svg',)
    list_editable = ('is_active',)
    ordering = ['order']
    
    def preview_svg(self, obj):
        if obj.img_svg:
            return mark_safe(f'<img src="{obj.img_svg.url}" style="height: 50px; background-color: white;"/>')
        return "No SVG"
    preview_svg.short_description = 'SVG Preview'
    
@admin.register(Contacto)
class ContactoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'telefono', 'mensaje', 'created_at', 'is_read')
    list_display_links = ('nombre',)
    list_editable = ('is_read',)
    ordering = ['-created_at']