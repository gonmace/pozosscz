# views.py
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from .serializers import FormularioSerializer
from django.core.mail import send_mail  # Ejemplo de procesamiento
from rest_framework.permissions import AllowAny


class FormularioAPIView(APIView):
    permission_classes = [AllowAny]

    def post(self, request, *args, **kwargs):
        serializer = FormularioSerializer(data=request.data)
        if serializer.is_valid():

            formulario = serializer.save()
            # Enviar un correo electrónico
            send_mail(
                f'{formulario.nombre} - {formulario.telefono}',
                formulario.mensaje,
                'admin@pozosscz.com',  # Remitente
                ['serprolim@limpiezapozossepticos.com'],  # Destinatario
                fail_silently=False,
            )

            return Response(
                {"message": "Formulario recibido con éxito"},
                status=status.HTTP_200_OK
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
