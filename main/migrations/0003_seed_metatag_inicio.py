from django.db import migrations


def seed_metatag_inicio(apps, schema_editor):
    MetaTag = apps.get_model('main', 'MetaTag')
    MetaTag.objects.update_or_create(
        slug='inicio',
        defaults={
            'title': 'Limpieza de Pozos Ciegos y Sépticos en Santa Cruz | PozosSCZ',
            'description': (
                'Desagote de pozos ciegos y sépticos en Santa Cruz, Bolivia. '
                'Precio al instante sin sorpresas. Servicio rápido para hogares, '
                'empresas y condominios.'
            ),
        },
    )


def reverse_seed(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0002_add_testimonio_preguntafrecuente'),
    ]

    operations = [
        migrations.RunPython(seed_metatag_inicio, reverse_seed),
    ]
