import os
import django
import sys
from datetime import timedelta

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import ConfiguracaoLoja, Plano, UserProfile
from django.utils import timezone

# 1. Update Plans
pro_plan, _ = Plano.objects.get_or_create(
    nome='PRO',
    defaults={'preco_mensal': 129.9, 'max_produtos': 200, 'recursos': {'whatsapp': True, 'cardapio_digital': True, 'pedidos': True, 'pdv': True, 'kanban': True, 'mesas': True, 'equipe': 3}}
)
pro_plan.recursos = {'whatsapp': True, 'cardapio_digital': True, 'pedidos': True, 'pdv': True, 'kanban': True, 'mesas': True, 'equipe': 3}
pro_plan.save()

# 2. Update ALL Stores
print("Fixing ALL stores in database...")
for s in ConfiguracaoLoja.objects.all():
    s.plano = pro_plan
    s.plano_tipo = 'PRO'
    s.status_assinatura = 'active'
    s.ativa = True
    s.valido_ate = timezone.now() + timedelta(days=365)
    s.save()
    print(f"Store '{s.nome}' (Slug: {s.slug}) -> PRO/active/valid.")

# 3. Verify ALL Users
print("\nVerifying ALL users...")
for u in User.objects.all():
    u.is_active = True
    u.save()
    profile, _ = UserProfile.objects.get_or_create(user=u)
    profile.is_verified = True
    profile.save()

# 4. Clear Cache
from django.core.cache import cache
cache.clear()

print("\n🚀 TOTAL FIX APPLIED TO EVERY OBJECT IN DATABASE.")
