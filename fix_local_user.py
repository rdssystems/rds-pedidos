from django.contrib.auth.models import User
from core.models import ConfiguracaoLoja, Plano
from django.utils import timezone
from datetime import timedelta

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
    
    plano_start = None
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
    else:
        print(f'Usuário local {email} já EXISTIA.')

    # Store
    loja = ConfiguracaoLoja.objects.filter(owner=user).first()
    if not loja:
        loja = ConfiguracaoLoja.objects.create(
            owner=user,
            nome='Local RDS',
            slug='rds-local',
            whatsapp='5500000000000'
        )
        print('Loja local criada.')
    
    loja.plano = plano_start
    loja.plano_tipo = 'START'
    loja.status_assinatura = 'active'
    loja.valido_ate = timezone.now() + timedelta(days=365)
    loja.save()
    print('Assinatura local ATUALIZADA para Start (Ativo)!')

except Exception as e:
    import traceback
    traceback.print_exc()
    print(f'Erro local: {e}')
