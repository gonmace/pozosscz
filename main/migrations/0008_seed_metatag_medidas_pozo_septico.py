from django.db import migrations


def seed_metatag(apps, schema_editor):
    MetaTag = apps.get_model('main', 'MetaTag')
    MetaTag.objects.update_or_create(
        slug='medidas-pozo-septico',
        defaults={
            'title': 'Medidas y Dimensiones de un Pozo Séptico (Guía) | PozosSCZ',
            'description': (
                'Qué medidas debe tener un pozo séptico según el número de personas: '
                'tabla de capacidad, volumen en litros y profundidad recomendada. '
                'Calculadora gratuita y servicio de limpieza en Santa Cruz.'
            ),
        },
    )


def reverse_seed(apps, schema_editor):
    MetaTag = apps.get_model('main', 'MetaTag')
    MetaTag.objects.filter(slug='medidas-pozo-septico').delete()


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0007_update_metatag_inicio_description'),
    ]

    operations = [
        migrations.RunPython(seed_metatag, reverse_seed),
    ]
