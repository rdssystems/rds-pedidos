import os
import django
import sys

# Configure Django settings module
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes
from django.conf import settings

def get_reset_link(email):
    user = User.objects.filter(email=email).first()
    if not user:
        return "Usuário não encontrado."
        
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    
    frontend_url = "https://app.rdspedidos.com.br"
    reset_url = f"{frontend_url}/reset-password?uid={uid}&token={token}"
    return reset_url

print(get_reset_link("klismanrds@gmail.com"))
