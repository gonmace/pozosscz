from django.db import migrations


METATAGS = [
    {
        'slug': 'limpieza-pozo-ciego-santa-cruz',
        'title': 'Limpieza de Pozos Ciegos en Santa Cruz | PozosSCZ',
        'description': (
            'Desagote y limpieza de pozos ciegos en Santa Cruz, Bolivia. '
            'Precio al instante, sin sorpresas. Warnes, Cotoca, La Guardia, Plan 3000 y más. '
            'Servicio el mismo día.'
        ),
    },
    {
        'slug': 'limpieza-pozos-septicos-santa-cruz',
        'title': 'Limpieza de Pozos Sépticos en Santa Cruz | PozosSCZ',
        'description': (
            'Servicio profesional de limpieza de pozos sépticos en Santa Cruz, Bolivia. '
            'Precio online al instante. Atendemos hogares, condominios y empresas.'
        ),
    },
    {
        'slug': 'limpieza-camaras-septicas',
        'title': 'Limpieza de Cámaras Sépticas en Santa Cruz | PozosSCZ',
        'description': (
            'Desagote y limpieza de cámaras sépticas en Santa Cruz de la Sierra. '
            'Precio fijo sin sorpresas. Servicio el mismo día para hogares y empresas.'
        ),
    },
    {
        'slug': 'limpieza-pozos-warnes',
        'title': 'Limpieza de Pozos Sépticos en Warnes | PozosSCZ',
        'description': (
            'Servicio de limpieza de pozos sépticos y ciegos en Warnes, Santa Cruz. '
            'Llegamos el mismo día. Precio al instante sin llamadas.'
        ),
    },
    {
        'slug': 'limpieza-pozos-cotoca',
        'title': 'Limpieza de Pozos Sépticos en Cotoca | PozosSCZ',
        'description': (
            'Desagote de pozos sépticos y ciegos en Cotoca, Santa Cruz. '
            'Precio online al instante. Servicio rápido y profesional.'
        ),
    },
    {
        'slug': 'limpieza-pozos-la-guardia',
        'title': 'Limpieza de Pozos Sépticos en La Guardia | PozosSCZ',
        'description': (
            'Limpieza de pozos sépticos y ciegos en La Guardia, Santa Cruz. '
            'Precio fijo online. Atendemos todo el municipio.'
        ),
    },
    {
        'slug': 'limpieza-pozos-plan-3000',
        'title': 'Limpieza de Pozos Sépticos en Plan 3000 | PozosSCZ',
        'description': (
            'Servicio de limpieza de pozos sépticos y ciegos en Plan 3000 y Villa 1ro de Mayo. '
            'Precio al instante. Amplia experiencia en la zona sur de Santa Cruz.'
        ),
    },
    {
        'slug': 'limpieza-pozos-urubo',
        'title': 'Limpieza de Pozos Sépticos en Urubó | PozosSCZ',
        'description': (
            'Limpieza de pozos sépticos para condominios y residencias del Urubó, Santa Cruz. '
            'Servicio discreto y profesional. Precio al instante.'
        ),
    },
]


def seed_metatags(apps, schema_editor):
    MetaTag = apps.get_model('main', 'MetaTag')
    for data in METATAGS:
        MetaTag.objects.update_or_create(
            slug=data['slug'],
            defaults={
                'title': data['title'],
                'description': data['description'],
            },
        )


def reverse_seed(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0004_seed_metatag_cotiza'),
    ]

    operations = [
        migrations.RunPython(seed_metatags, reverse_seed),
    ]
