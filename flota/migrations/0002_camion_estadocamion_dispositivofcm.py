"""
Mueve los modelos Camion, EstadoCamion y DispositivoFCM de pozosscz a moviles.
Solo cambia el estado de Django (app_label) — las tablas no se tocan porque
todos los modelos declaran db_table apuntando a las tablas existentes.
"""
import django.db.models.deletion
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('flota', '0001_initial'),
        ('pozosscz', '0033_estadocamion_direccion_estadocamion_velocidad'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                # 1. Crear Camion en moviles (tabla existente: pozosscz_camion)
                migrations.CreateModel(
                    name='Camion',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('usuario', models.OneToOneField(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name='camion', to=settings.AUTH_USER_MODEL, verbose_name='Usuario chofer')),
                        ('operador', models.CharField(max_length=100, verbose_name='Nombre del operador')),
                        ('marca', models.CharField(max_length=100, verbose_name='Camión (marca/modelo)')),
                        ('capacidad', models.IntegerField(default=18000, verbose_name='Capacidad (litros)')),
                        ('created_at', models.DateTimeField(auto_now_add=True)),
                        ('lat', models.FloatField(blank=True, null=True, verbose_name='Última latitud')),
                        ('lon', models.FloatField(blank=True, null=True, verbose_name='Último longitud')),
                        ('activo', models.BooleanField(default=False, verbose_name='En servicio')),
                        ('ultima_actualizacion', models.DateTimeField(blank=True, null=True, verbose_name='Última actualización')),
                        ('tracking_activo', models.BooleanField(default=True, help_text='Si está desactivado, el chofer no puede enviar ubicación', verbose_name='Tracking activo')),
                        ('intervalo_tracking', models.PositiveIntegerField(default=30, help_text='Cada cuántos segundos el teléfono envía su ubicación (mínimo 10)', verbose_name='Intervalo de tracking (seg)')),
                    ],
                    options={
                        'verbose_name': 'Camión',
                        'verbose_name_plural': 'Camiones',
                        'ordering': ['operador'],
                        'db_table': 'pozosscz_camion',
                    },
                ),
                # 2. Crear EstadoCamion en moviles (tabla existente: pozosscz_estadocamion)
                migrations.CreateModel(
                    name='EstadoCamion',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('camion', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='estados', to='flota.camion', verbose_name='Camión')),
                        ('activo', models.BooleanField(default=False, verbose_name='En servicio')),
                        ('lat', models.FloatField(verbose_name='Latitud')),
                        ('lon', models.FloatField(verbose_name='Longitud')),
                        ('velocidad', models.FloatField(default=0, verbose_name='Velocidad (km/h)')),
                        ('direccion', models.FloatField(default=0, help_text='0=Norte, 90=Este, 180=Sur, 270=Oeste', verbose_name='Dirección (°)')),
                        ('diesel', models.IntegerField(default=0, verbose_name='Diesel cargado (Bs)')),
                        ('nivel_tanque', models.FloatField(default=0.0, help_text='0=Vacío, 0.33=1/3, 0.67=2/3, 1.0=Lleno', verbose_name='Nivel del tanque (0.0 a 1.0)')),
                        ('registrado_at', models.DateTimeField(auto_now_add=True)),
                    ],
                    options={
                        'verbose_name': 'Estado de Camión',
                        'verbose_name_plural': 'Estados de Camión',
                        'ordering': ['-registrado_at'],
                        'db_table': 'pozosscz_estadocamion',
                    },
                ),
                # 3. Crear DispositivoFCM en moviles (tabla existente: pozosscz_dispositivofcm)
                migrations.CreateModel(
                    name='DispositivoFCM',
                    fields=[
                        ('id', models.AutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                        ('usuario', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='dispositivos', to=settings.AUTH_USER_MODEL, verbose_name='Usuario')),
                        ('fcm_token', models.TextField(unique=True, verbose_name='Token FCM')),
                        ('activo', models.BooleanField(default=True, verbose_name='Activo')),
                        ('registrado_at', models.DateTimeField(auto_now=True, verbose_name='Última actualización')),
                    ],
                    options={
                        'verbose_name': 'Dispositivo FCM',
                        'verbose_name_plural': 'Dispositivos FCM',
                        'db_table': 'pozosscz_dispositivofcm',
                    },
                ),
                # 4. Actualizar PanelChoferes para que herede de moviles.Camion
                migrations.DeleteModel(name='PanelChoferes'),
                migrations.CreateModel(
                    name='PanelChoferes',
                    fields=[],
                    options={
                        'verbose_name': 'Panel de Choferes',
                        'verbose_name_plural': 'Panel de Choferes',
                        'proxy': True,
                        'indexes': [],
                        'constraints': [],
                    },
                    bases=('flota.camion',),
                ),
            ],
            database_operations=[],
        ),
    ]
