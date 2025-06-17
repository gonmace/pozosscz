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
    list_display = (
        'format_created_at',
        'name',
        'tel1',
        'cod',
        'cost',
        'status',
        'service',
        'user',
        'address'
    )
    list_editable = (
        'status', 'service', 'name', 'tel1', 'cod', 'cost','address'
    )
    list_display_links = ('format_created_at', )

    def format_created_at(self, obj):
        return obj.created_at.strftime('%d-%m-%Y, %H:%M')

    format_created_at.short_description = 'Creado'

    formfield_overrides = {
        models.CharField: {'widget': TextInput(attrs={'size': '8'})},
        models.TextField: {'widget': TextInput(attrs={'size': '40'})},
    }

    class Media:
        css = {
            'all': ('css/admin/styles.css',)
        }
