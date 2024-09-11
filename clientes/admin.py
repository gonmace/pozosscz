from django.forms import TextInput
from import_export import resources
from import_export.admin import ImportExportModelAdmin
from django.db import models

from django.contrib import admin
from .models import Cliente


class ClienteResource(resources.ModelResource):
    fields = (
        'tel1',
        'tel2',
        'name',
        'address',
        'cod',
        'cost',
        'service',
        'lat',
        'lon',
        'status',
        'created_at'
    )

    class Meta:
        model = Cliente


@admin.register(Cliente)
class ClienteAdmin(ImportExportModelAdmin):
    resource_class = ClienteResource
    # readonly_fields = ('created_at','updated_at')
    list_display = (
        'id',
        'name',
        'tel1',
        'cod',
        'cost',
        'status',
        'service',
        'lat',
        'lon',
        'user',
        'format_created_at',
        'format_updated_at'
    )
    list_editable = (
        'status', 'service', 'name', 'tel1', 'cod'
    )
    list_display_links = ('id', )

    def format_created_at(self, obj):
        return obj.created_at.strftime('%d-%m-%Y, %H:%M')

    format_created_at.admin_order_field = 'created_at'
    format_created_at.short_description = 'Creado'

    def format_updated_at(self, obj):
        return obj.updated_at.strftime('%d-%m-%Y, %H:%M')

    format_updated_at.admin_order_field = 'updated_at'
    format_updated_at.short_description = 'Actualizado'

    formfield_overrides = {
        models.CharField: {'widget': TextInput(attrs={'size': '8'})},
    }

    class Media:
        css = {
            'all': ('css/admin/styles.css',)
        }
