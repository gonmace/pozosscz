"""
Alinea el *estado* de flota con el *DB real* heredado de pozosscz.

En pozosscz.0028 las tablas ya se crearon con BigAutoField y en pozosscz.0029
ya se renombró el índice a `pozosscz_es_camion__77da9f_idx`. Las tablas físicas
no deben tocarse acá: solo ajustamos el state de Django para que coincida con
lo que existe en el DB (SeparateDatabaseAndState, database_operations=[]).
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('flota', '0002_camion_estadocamion_dispositivofcm'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='camion',
                    name='id',
                    field=models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
                ),
                migrations.AlterField(
                    model_name='dispositivofcm',
                    name='id',
                    field=models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
                ),
                migrations.AlterField(
                    model_name='estadocamion',
                    name='id',
                    field=models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID'),
                ),
                migrations.AddIndex(
                    model_name='estadocamion',
                    index=models.Index(fields=['camion', 'registrado_at'], name='pozosscz_es_camion__77da9f_idx'),
                ),
            ],
            database_operations=[],
        ),
    ]
