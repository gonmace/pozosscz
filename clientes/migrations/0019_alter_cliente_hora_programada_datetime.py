"""
Cambio hora_programada de TimeField (time without tz) a DateTimeField
(timestamp with tz).

PostgreSQL no puede castear directamente time → timestamptz. Los valores
anteriores representaban "hora sin fecha" — ya no tienen sentido con el
nuevo campo, así que los seteamos a NULL en la conversión.
"""
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('clientes', '0018_cliente_hora_programada'),
    ]

    operations = [
        migrations.SeparateDatabaseAndState(
            state_operations=[
                migrations.AlterField(
                    model_name='cliente',
                    name='hora_programada',
                    field=models.DateTimeField(blank=True, null=True, verbose_name='fecha y hora programada'),
                ),
            ],
            database_operations=[
                migrations.RunSQL(
                    sql=(
                        'ALTER TABLE clientes_cliente '
                        'ALTER COLUMN hora_programada '
                        'TYPE timestamp with time zone '
                        'USING NULL;'
                    ),
                    reverse_sql=(
                        'ALTER TABLE clientes_cliente '
                        'ALTER COLUMN hora_programada '
                        'TYPE time without time zone '
                        'USING NULL;'
                    ),
                ),
            ],
        ),
    ]
