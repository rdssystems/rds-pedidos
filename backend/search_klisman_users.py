import os
import django
import sys
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import ConfiguracaoLoja, Plano

users = User.objects.filter(username__icontains='klisman')
print(f"--- MATCHING USERS ({users.count()}) ---")
for u in users:
    print(f"User: '{u.username}', Email: '{u.email}'")
    stores = ConfiguracaoLoja.objects.filter(owner=u)
    for s in stores:
        print(f"  - Store: {s.nome} (Slug: {s.slug}, Plan={s.plano.nome if s.plano else 'None'}, Status={s.status_assinatura})")
