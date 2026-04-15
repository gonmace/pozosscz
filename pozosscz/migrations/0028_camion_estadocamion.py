from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('pozosscz', '0027_perfil_usuario'),
    ]

    operations = [
        migrations.CreateModel(
            name='Camion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('operador', models.CharField(max_length=100, verbose_name='Nombre del operador')),
                ('marca', models.CharField(max_length=100, verbose_name='Camión (marca/modelo)')),
                ('capacidad', models.IntegerField(default=18000, verbose_name='Capacidad (litros)')),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={
                'verbose_name': 'Camión',
                'verbose_name_plural': 'Camiones',
                'ordering': ['operador'],
            },
        ),
        migrations.CreateModel(
            name='EstadoCamion',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('activo', models.BooleanField(default=False, verbose_name='En servicio')),
                ('lat', models.FloatField(verbose_name='Latitud')),
                ('lon', models.FloatField(verbose_name='Longitud')),
                ('diesel', models.IntegerField(default=0, verbose_name='Diesel cargado (Bs)')),
                ('nivel_tanque', models.FloatField(
                    default=0.0,
                    help_text='0=Vacío, 0.33=1/3, 0.67=2/3, 1.0=Lleno',
                    verbose_name='Nivel del tanque (0.0 a 1.0)',
                )),
                ('registrado_at', models.DateTimeField(auto_now_add=True)),
                ('camion', models.ForeignKey(
                    on_delete=django.db.models.deletion.CASCADE,
                    related_name='estados',
                    to='pozosscz.camion',
                    verbose_name='Camión',
                )),
            ],
            options={
                'verbose_name': 'Estado de Camión',
                'verbose_name_plural': 'Estados de Camión',
                'ordering': ['-registrado_at'],
                'indexes': [
                    models.Index(fields=['camion', 'registrado_at'], name='pozosscz_es_camion__idx'),
                ],
            },
        ),
    ]
