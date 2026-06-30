from django.db import migrations


NEW_DESCRIPTION = (
    'Limpieza y desagote de pozos ciegos y sépticos en Santa Cruz. '
    'Cotiza online en 30 segundos, sin llamadas ni sorpresas. '
    'Servicio rápido para casas y empresas.'
)

OLD_DESCRIPTION = (
    'Desagote de pozos ciegos y sépticos en Santa Cruz, Bolivia. '
    'Precio al instante sin sorpresas. Servicio rápido para hogares, '
    'empresas y condominios.'
)


def update_description(apps, schema_editor):
    MetaTag = apps.get_model('main', 'MetaTag')
    MetaTag.objects.update_or_create(
        slug='inicio',
        defaults={
            'title': 'Limpieza de Pozos Ciegos y Sépticos en Santa Cruz | PozosSCZ',
            'description': NEW_DESCRIPTION,
        },
    )


def reverse_description(apps, schema_editor):
    MetaTag = apps.get_model('main', 'MetaTag')
    MetaTag.objects.filter(slug='inicio').update(description=OLD_DESCRIPTION)


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0006_seed_metatag_contact'),
    ]

    operations = [
        migrations.RunPython(update_description, reverse_description),
    ]
