# Generated by Django 5.2.1 on 2025-06-06 16:44

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pozosscz', '0013_alter_preciospozosscz_costo_mantenimiento'),
    ]

    operations = [
        migrations.AlterField(
            model_name='preciospozosscz',
            name='precio_base',
            field=models.IntegerField(default=300, help_text='Precio base en Bs', verbose_name='Precio base (Bs)'),
        ),
    ]
