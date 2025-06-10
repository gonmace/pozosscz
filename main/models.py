from django.db import models
from django.core.exceptions import ValidationError
from meta.views import Meta as MetaObject

class MetaTag(models.Model):
    slug = models.SlugField(unique=True, help_text="Identificador de la página (por ejemplo: 'contacto')")
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    image = models.ImageField(upload_to='meta_images/', blank=True, null=True)

    def as_meta(self, request=None):
        kwargs = {
            "title": self.title,
            "description": self.description,
            "use_og": True,
            "use_twitter": True,
            "use_facebook": True,
        }
        if self.image and request:
            kwargs["image"] = request.build_absolute_uri(self.image.url)
        return MetaObject(request=request, **kwargs)

    def __str__(self):
        return self.slug

def validate_svg(value):
    if not value.name.endswith('.svg'):
        raise ValidationError('File must be an SVG')

class Banner(models.Model):
    svg = models.FileField(upload_to='banner/', validators=[validate_svg], help_text='Upload an SVG file')
    img = models.ImageField(upload_to='banner/')
    img_alt = models.CharField(max_length=255)
    is_active = models.BooleanField(default=False, help_text='Solo un banner puede estar activo')

    def save(self, *args, **kwargs):
        if self.is_active:
            # Desactivar todos los otros banners
            Banner.objects.exclude(pk=self.pk).update(is_active=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.img_alt} {'(Activo)' if self.is_active else ''}"

class Alcance(models.Model):
    img_svg = models.FileField(upload_to='alcance/', validators=[validate_svg], help_text='Upload an SVG file')
    titulo = models.CharField(max_length=255)
    descripcion = models.TextField()
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0, blank=False, null=False)

    def __str__(self):
        return self.titulo
    
    class Meta:
        verbose_name = 'Alcance'
        verbose_name_plural = 'Alcance'
        ordering = ['order']
        
class TipoCliente(models.Model):
    img_svg = models.FileField(upload_to='tipo_cliente/', validators=[validate_svg], help_text='Upload an SVG file')
    nombre = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    order = models.PositiveIntegerField(default=0, blank=False, null=False)
    
    def __str__(self):
        return self.nombre
    
    class Meta:
        verbose_name = 'Tipo de Cliente'
        verbose_name_plural = 'Tipos de Clientes'
        ordering = ['order']
        
class Contacto(models.Model):
    nombre = models.CharField(max_length=255)
    telefono = models.CharField(max_length=255)
    mensaje = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)
    is_read = models.BooleanField(default=False)
    
    def __str__(self):
        return self.nombre
    
    class Meta:
        verbose_name = 'Contacto'
        verbose_name_plural = 'Contactos'
        ordering = ['-created_at']