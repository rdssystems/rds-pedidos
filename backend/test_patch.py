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

data = {
    'nome': store.nome,
    'tipo_taxa_entrega': 'FIXA',
    'taxa_entrega_fixa': '15.55',
    'horario_funcionamento': '{"seg": {"open": "08:00", "close": "18:00", "closed": False}}'
}

res = client.patch(f'/api/lojas/{store.slug}/', data, format='multipart')
print('Status:', res.status_code)
# print('Response:', res.data)
store.refresh_from_db()
print('DB Tipo:', store.tipo_taxa_entrega)
print('DB Fixa:', store.taxa_entrega_fixa)
