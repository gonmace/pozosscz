# Generated by Django 5.2.1 on 2025-06-09 00:08

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('pozosscz', '0019_alter_preciospozosscz_costo_adicional_km_retorno_and_more'),
    ]

    operations = [
        migrations.AlterModelOptions(
            name='datosgenerales',
            options={'verbose_name': 'Datos Generales', 'verbose_name_plural': 'Datos Generales'},
        ),
        migrations.AddField(
            model_name='datosgenerales',
            name='mensaje_whatsapp',
            field=models.TextField(default='¡Hola!, Requiero el servicio de limpieza en la siguiente ubicación: ', verbose_name='Whatsapp'),
        ),
        migrations.AlterField(
            model_name='datosgenerales',
            name='mensaje_cotizar',
            field=models.TextField(default='El precio del servicio contempla la limpieza del pozo y cámara séptica para vivienda. ', verbose_name='Cotizar'),
        ),
    ]
