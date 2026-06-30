from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0017_cliente_jornada'),
    ]

    operations = [
        migrations.AddField(
            model_name='cliente',
            name='hora_programada',
            field=models.TimeField(blank=True, null=True, verbose_name='hora programada'),
        ),
    ]
