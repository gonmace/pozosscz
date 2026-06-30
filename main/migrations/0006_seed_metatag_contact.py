from django.db import migrations


def seed_metatag_contact(apps, schema_editor):
    MetaTag = apps.get_model('main', 'MetaTag')
    MetaTag.objects.update_or_create(
        slug='contact',
        defaults={
            'title': 'Contacto · Limpieza de Pozos en Santa Cruz | PozosSCZ',
            'description': (
                'Contactá a PozosSCZ para limpieza de pozos sépticos y ciegos en Santa '
                'Cruz. Respuesta inmediata por WhatsApp o dejanos tu mensaje.'
            ),
        },
    )


def reverse_seed(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('main', '0005_seed_metatags_servicios_zonas'),
    ]

    operations = [
        migrations.RunPython(seed_metatag_contact, reverse_seed),
    ]
