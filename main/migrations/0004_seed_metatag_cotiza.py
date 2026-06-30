from django.db import migrations


def seed_metatag_cotiza(apps, schema_editor):
    MetaTag = apps.get_model('main', 'MetaTag')
    MetaTag.objects.update_or_create(
        slug='cotiza',
        defaults={
            'title': 'Cotizá Limpieza de Pozo Séptico en Santa Cruz | PozosSCZ',
            'description': (
                'Recibí el precio de limpieza de tu pozo en Santa Cruz al instante. '
                'Servicio a domicilio en Warnes, Cotoca, La Guardia, Plan 3000 y más zonas.'
            ),
        },
    )


def reverse_seed(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0003_seed_metatag_inicio'),
    ]

    operations = [
        migrations.RunPython(seed_metatag_cotiza, reverse_seed),
    ]
