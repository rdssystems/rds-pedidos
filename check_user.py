import os
import django

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import ConfiguracaoLoja

email = 'klsimanrds90@gmail.com'
try:
    user = User.objects.get(email=email)
    loja = ConfiguracaoLoja.objects.get(owner=user)
    print(f"User: {user.email}")
    print(f"Store: {loja.nome}")
    print(f"Plan Type: {loja.plano_tipo}")
    print(f"Subscription Status: {loja.status_assinatura}")
    print(f"Valid Until: {loja.valido_ate}")
except Exception as e:
    print(f"Error checking user: {e}")
