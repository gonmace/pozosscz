from django.db import migrations


class Migration(migrations.Migration):

    dependencies = [
        ('flota', '0005_estadocamion_comentario'),
    ]

    operations = [
        migrations.RenameModel(
            old_name='EstadoCamion',
            new_name='RegistroCamion',
        ),
    ]
