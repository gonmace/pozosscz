from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0018_cliente_hora_programada'),
    ]

    operations = [
        migrations.AlterField(
            model_name='cliente',
            name='hora_programada',
            field=models.DateTimeField(blank=True, null=True, verbose_name='fecha y hora programada'),
        ),
    ]
