from django import forms
from crispy_forms.helper import FormHelper
from crispy_forms.layout import Layout, Submit, Field

class ContactForm(forms.Form):
    nombre = forms.CharField(
        max_length=100,
        widget=forms.TextInput(attrs={
            'class': '!input !input-bordered !input-primary w-full',
            'placeholder': 'Tu nombre'
        })
    )
    telefono = forms.CharField(
        max_length=20,
        widget=forms.TextInput(attrs={
            'class': '!input !input-bordered !input-primary w-full',
            'placeholder': 'Tu teléfono'
        })
    )
    mensaje = forms.CharField(
        widget=forms.Textarea(attrs={
            'class': '!textarea !textarea-bordered !textarea-primary w-full',
            'placeholder': 'Tu mensaje',
            'rows': 4
        })
    )

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.helper = FormHelper()
        self.helper.form_method = 'post'
        self.helper.layout = Layout(
            Field('nombre', css_class='mb-4'),
            Field('telefono', css_class='mb-4'),
            Field('mensaje', css_class='mb-4'),
            Submit('submit', 'Enviar Mensaje', css_class='btn btn-secondary w-full')
        ) 