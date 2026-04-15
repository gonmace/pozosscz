"""
Renombra las entradas de la app en django_content_type de 'moviles' a 'flota'.
Esto mantiene los permisos del admin y las relaciones de contenido intactas.
"""
from django.db import migrations


def renombrar_content_types(apps, schema_editor):
    ContentType = apps.get_model('contenttypes', 'ContentType')
    ContentType.objects.filter(app_label='moviles').update(app_label='flota')


class Migration(migrations.Migration):

    dependencies = [
        ('flota', '0003_alter_camion_id_alter_dispositivofcm_id_and_more'),
        ('contenttypes', '0002_remove_content_type_name'),
    ]

    operations = [
        migrations.RunPython(renombrar_content_types, migrations.RunPython.noop),
    ]
