from django import forms
from django.forms import TextInput, DateTimeInput
from django.contrib.admin.widgets import AdminSplitDateTime
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
        'precio_cotizado',
        'service',
        'lat',
        'lon',
        'status',
        'created_at'
    )

    class Meta:
        model = Cliente


class ClienteAdminForm(forms.ModelForm):
    hora_programada = forms.SplitDateTimeField(
        widget=AdminSplitDateTime(),
        required=False,
        label='Programada',
    )

    class Meta:
        model = Cliente
        fields = '__all__'


@admin.register(Cliente)
class ClienteAdmin(ImportExportModelAdmin):
    resource_class = ClienteResource
    form = ClienteAdminForm
    list_display = (
        'format_created_at',
        'name',
        'tel1',
        'cod',
        'precio_cotizado',
        'cost',
        'status',
        'activo',
        'camion',
        'hora_programada',
        'service',
        'user',
        'address',
    )
    list_editable = (
        'status', 'activo', 'camion', 'hora_programada', 'service', 'name', 'tel1', 'cod', 'cost', 'address'
    )
    list_display_links = ('format_created_at', )
    list_filter = ('activo', 'status', 'service', 'user')
    search_fields = ('name', 'tel1', 'tel2', 'address', 'cod')

    def format_created_at(self, obj):
        return obj.created_at.strftime('%d-%m-%Y, %H:%M')

    format_created_at.short_description = 'Creado'

    formfield_overrides = {
        models.CharField: {'widget': TextInput(attrs={'size': '8'})},
        models.TextField: {'widget': TextInput(attrs={'size': '40'})},
    }

    def get_changelist_form(self, request, **kwargs):
        kwargs.setdefault('form', ClienteAdminForm)
        return super().get_changelist_form(request, **kwargs)

    def formfield_for_dbfield(self, db_field, request, **kwargs):
        if isinstance(db_field, models.DateTimeField) and db_field.name != 'hora_programada':
            kwargs['form_class'] = forms.DateTimeField
            kwargs['widget'] = DateTimeInput(
                attrs={'size': '16', 'placeholder': 'DD/MM/AAAA HH:MM'},
                format='%d/%m/%Y %H:%M',
            )
            kwargs['input_formats'] = ['%d/%m/%Y %H:%M', '%d/%m/%Y %H:%M:%S']
        return super().formfield_for_dbfield(db_field, request, **kwargs)

    class Media:
        css = {
            'all': ('css/admin/styles.css',)
        }
