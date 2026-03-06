import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from rest_framework.test import APIClient
from core.models import ConfiguracaoLoja

store = ConfiguracaoLoja.objects.first()
user = store.owner

client = APIClient()
client.force_authenticate(user=user)

# Simular payload exatamente como o formData stringificado no Javascript (tudo string)
data = {
    'nome': 'Minha Loja',
    'tipo_taxa_entrega': 'BAIRRO',
    'taxa_entrega_fixa': '17.95',
    'horario_funcionamento': '{"seg": {"open": "08:00", "close": "18:00", "closed": false}}'
}

res = client.patch(f'/api/lojas/{store.slug}/', data, format='multipart')
print("Response Status:", res.status_code)
# print("Response Data:", res.data)
store.refresh_from_db()
print("DB Tipo:", store.tipo_taxa_entrega)
print("DB Taxa Fixa:", store.taxa_entrega_fixa)
