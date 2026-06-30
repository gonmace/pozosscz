from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ('clientes', '0016_cliente_updated_at'),
    ]
    operations = [
        migrations.AddField(
            model_name='cliente',
            name='jornada',
            field=models.BooleanField(default=False, verbose_name='en jornada'),
        ),
    ]
