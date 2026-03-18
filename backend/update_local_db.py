import os
import django
import sys
from django.utils import timezone
from datetime import timedelta

# Add the current directory to sys.path to find core
sys.path.append(os.getcwd())
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from django.contrib.auth.models import User
from core.models import ConfiguracaoLoja, Plano

email = 'klismanrds90@gmail.com'
password = 'TestPassword123!'

try:
    # Seed Plans
    plans_data = [
        {
            'nome': 'Start',
            'preco_mensal': 49.90, 
            'max_produtos': 50,
            'recursos': {'whatsapp': True, 'cardapio_digital': True, 'pedidos': True, 'pdv': True}
        },
        {
            'nome': 'Pro',
            'preco_mensal': 129.90, 
            'max_produtos': 200,
            'recursos': {'whatsapp': True, 'cardapio_digital': True, 'pedidos': True, 'pdv': True, 'kanban': True, 'mesas': True, 'equipe': 3}
        },
        {
            'nome': 'Elite',
            'preco_mensal': 249.90, 
            'max_produtos': 1000,
            'recursos': {'whatsapp': True, 'cardapio_digital': True, 'pedidos': True, 'pdv': True, 'kanban': True, 'mesas': True, 'equipe': 10, 'ifood': True}
        }
    ]
    
    for pd in plans_data:
        p, created = Plano.objects.update_or_create(
            nome=pd['nome'],
            defaults={
                'preco_mensal': pd['preco_mensal'],
                'max_produtos': pd['max_produtos'],
                'recursos': pd['recursos']
            }
        )
        if pd['nome'] == 'Start':
            plano_start = p
        print(f"Plano local {pd['nome']} {'CRIADO' if created else 'ATUALIZADO'}.")

    # User
    user, created = User.objects.get_or_create(
        email=email,
        defaults={'username': email, 'first_name': 'Klisman Local'}
    )
    if created:
        user.set_password(password)
        user.save()
        print(f'Usuário local {email} CRIADO.')
    
    # Store
    loja = ConfiguracaoLoja.objects.filter(owner=user).first()
    if not loja:
        loja = ConfiguracaoLoja.objects.create(
            owner=user,
            nome='RDS Local',
            slug='rds-local',
            whatsapp='5500000000000'
        )
        print('Loja local CRIADA.')
    
    loja.plano = plano_start
    loja.plano_tipo = 'START'
    loja.status_assinatura = 'active'
    loja.valido_ate = timezone.now() + timedelta(days=365)
    loja.save()
    print(f'Assinatura local da loja {loja.nome} ATUALIZADA para Start (Ativo)!')

except Exception as e:
    print(f'Erro local: {e}')
