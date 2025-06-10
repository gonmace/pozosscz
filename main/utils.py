from main.models import MetaTag
from meta.views import Meta as MetaObject
from django.conf import settings

def get_slug_from_request(request):
    """
    Extracts a slug from the request path.
    
    Args:
        request: The HTTP request object containing the path.
        
    Returns:
        str: The path stripped of leading/trailing slashes, or 'inicio' if the path is root ('/').
    """
    # Si está en la raíz ("/"), devolver 'inicio'
    path = request.path.strip('/')
    return path if path else 'inicio'

def get_meta_for_slug(slug, request=None):
    try:
        meta_tag = MetaTag.objects.get(slug=slug)
        return meta_tag.as_meta(request)
    except MetaTag.DoesNotExist:
        default = getattr(settings, 'DEFAULT_META', {})

        kwargs = {
            "title": default.get("TITLE", "Título por defecto"),
            "description": default.get("DESCRIPTION", ""),
            "keywords": default.get("KEYWORDS", []),
            "use_og": default.get("USE_OG", True),
            "use_twitter": default.get("USE_TWITTER", True),
            "use_facebook": default.get("USE_FACEBOOK", True),
        }

        image = default.get("IMAGE")
        if image and request:
            kwargs["image"] = request.build_absolute_uri(image)

        return MetaObject(request=request, **kwargs)