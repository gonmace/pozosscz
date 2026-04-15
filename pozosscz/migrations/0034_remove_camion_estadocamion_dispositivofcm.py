"""
Elimina Camion, EstadoCamion y DispositivoFCM del estado de pozosscz.
Esos modelos ahora viven en moviles (migración 0002).
Las tablas no se tocan — db_table en moviles apunta a las tabmas existentes.
"""
from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('pozosscz', '0033_estadocamion_direccion_estadocamion_velocidad'),
        ('flota', '0002_camion_estadocamion_dispositivofcm'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.DeleteModel(name='EstadoCamion'),
                migrations.DeleteModel(name='DispositivoFCM'),
                migrations.DeleteModel(name='Camion'),
            ],
            database_operations=[],
        ),
    ]
