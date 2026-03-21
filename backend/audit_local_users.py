import os
import django
import sys

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import ConfiguracaoLoja

print("--- USERS IN DATABASE ---")
for u in User.objects.all():
    print(f"ID {u.id}: Username='{u.username}', Email='{u.email}'")
    for s in ConfiguracaoLoja.objects.filter(owner=u):
        print(f"  - Store: '{s.nome}' (Slug: {s.slug}, ID: {s.id})")

print("\n--- ALL CONFIGS ---")
for s in ConfiguracaoLoja.objects.all():
    print(f"Store {s.id}: slug='{s.slug}', status='{s.status_assinatura}', plan='{s.plano_tipo}'")
