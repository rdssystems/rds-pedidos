import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.http import QueryDict
import json

q = QueryDict(mutable=True)
q.update({
    'nome': 'Minha Loja',
    'tipo_taxa_entrega': 'FIXA',
    'taxa_entrega_fixa': '16.75',
    'horario_funcionamento': '{"seg": {"open": "08:00", "close": "18:00", "closed": false}}'
})

data = q.copy()
data['horario_funcionamento'] = json.loads(data['horario_funcionamento'])

from rest_framework.test import APIRequestFactory
from core.views import StoreViewSet
from core.models import ConfiguracaoLoja
from django.contrib.auth.models import User

store = ConfiguracaoLoja.objects.first()
user = store.owner

factory = APIRequestFactory()
request = factory.patch(f'/api/lojas/{store.slug}/', data, format='multipart')
request.user = user
request.data = q # mock Request object has data attribute
from rest_framework.request import Request
drf_request = Request(request)
drf_request._data = q

view = StoreViewSet.as_view({'patch': 'partial_update'})
res = view(drf_request, slug=store.slug)
print("Response Status:", res.status_code)
store.refresh_from_db()
print("DB Fixa:", store.taxa_entrega_fixa)
