from django.db import models


class Formulario(models.Model):
    nombre = models.CharField(max_length=100)
    telefono = models.CharField(max_length=8)
    mensaje = models.TextField()

    def __str__(self):
        return f"{self.nombre} - {self.telefono}"
