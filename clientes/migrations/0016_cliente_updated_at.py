from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0015_remove_prb_add_motivo_cancelado'),
    ]

    operations = [
        migrations.AddField(
            model_name='cliente',
            name='updated_at',
            field=models.DateTimeField(auto_now=True, verbose_name='actualizado'),
        ),
    ]
