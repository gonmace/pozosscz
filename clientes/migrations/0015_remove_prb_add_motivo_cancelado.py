from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0014_add_problema_status'),
    ]

    operations = [
        migrations.AddField(
            model_name='cliente',
            name='motivo_cancelado',
            field=models.TextField(blank=True, default='', verbose_name='motivo cancelación'),
        ),
        migrations.AlterField(
            model_name='cliente',
            name='status',
            field=models.CharField(
                choices=[
                    ('COT', 'Cotizado'),
                    ('PRG', 'Programado'),
                    ('EJE', 'Ejecutado'),
                    ('CAN', 'Cancelado'),
                    ('NEG', 'L.negra'),
                ],
                default='COT',
                max_length=3,
                verbose_name='estado',
            ),
        ),
    ]
