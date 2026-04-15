from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0019_alter_cliente_hora_programada_datetime'),
    ]

    operations = [
        migrations.RenameField(
            model_name='cliente',
            old_name='jornada',
            new_name='activo',
        ),
        migrations.AlterField(
            model_name='cliente',
            name='activo',
            field=__import__('django.db.models', fromlist=['BooleanField']).BooleanField(default=False, verbose_name='Activo'),
        ),
    ]
