from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0022_cliente_orden'),
    ]

    operations = [
        migrations.AddIndex(
            model_name='cliente',
            index=models.Index(fields=['activo', 'camion'], name='cliente_activo_camion_idx'),
        ),
        migrations.AddIndex(
            model_name='cliente',
            index=models.Index(fields=['camion', 'orden'], name='cliente_camion_orden_idx'),
        ),
    ]
