from django.contrib.auth.models import User
from core.models import ConfiguracaoLoja, Plano
from django.utils import timezone
from datetime import timedelta

email = 'klismanrds@gmail.com'

try:
    # 1. Garantir que os planos existam
    plans_data = [
        {'nome': 'Start', 'preco_mensal': 49.90, 'max_produtos': 50, 'recursos': {'whatsapp': True, 'cardapio_digital': True, 'pedidos': True, 'pdv': True}},
        {'nome': 'Pro', 'preco_mensal': 129.90, 'max_produtos': 200, 'recursos': {'whatsapp': True, 'cardapio_digital': True, 'pedidos': True, 'pdv': True, 'kanban': True, 'mesas': True, 'equipe': 3}},
        {'nome': 'Elite', 'preco_mensal': 249.90, 'max_produtos': 1000, 'recursos': {'whatsapp': True, 'cardapio_digital': True, 'pedidos': True, 'pdv': True, 'kanban': True, 'mesas': True, 'equipe': 10, 'ifood': True}}
    ]
    
    plano_elite = None
    for pd in plans_data:
        p, created = Plano.objects.update_or_create(
            nome=pd['nome'],
            defaults={'preco_mensal': pd['preco_mensal'], 'max_produtos': pd['max_produtos'], 'recursos': pd['recursos']}
        )
        if pd['nome'] == 'Elite':
            plano_elite = p
        print(f"Plano {pd['nome']} {'CRIADO' if created else 'ATUALIZADO'}.")
    
    # 2. Buscar o usuário
    user = User.objects.filter(email=email).first()
    if not user:
        user = User.objects.create_user(username=email, email=email, password='TestPassword123!', first_name='Klisman RDS')
        print(f"Usuário {email} CRIADO.")
    else:
        print(f"Usuário {email} encontrado.")

    # 3. Buscar ou criar a loja
    loja = ConfiguracaoLoja.objects.filter(owner=user).first()
    if not loja:
        loja = ConfiguracaoLoja.objects.create(
            owner=user,
            nome='RDS Sistemas Local',
            slug='rds-local',
            whatsapp='5500000000000'
        )
        print(f"Loja {loja.nome} CRIADA.")
    
    # 4. Setar o plano ELITE
    loja.plano = plano_elite
    loja.plano_tipo = 'ELITE'
    loja.status_assinatura = 'active'
    loja.valido_ate = timezone.now() + timedelta(days=365)
    loja.save()
    
    print(f"Sucesso! Usuário {email} agora está no plano ELITE (Loja: {loja.slug}).")

except Exception as e:
    print(f"Erro: {e}")
