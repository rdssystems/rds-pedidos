import paramiko
import os
import sys

sys.stdout.reconfigure(line_buffering=True)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#', timeout=10)
print("Conectado na VPS!")

# Script content to be executed inside Django shell
django_script = """
from django.contrib.auth.models import User
from core.models import ConfiguracaoLoja, Plano
from django.utils import timezone
from datetime import timedelta

email = 'klismanrds90@gmail.com'
password = 'TestPassword123!'
try:
    # Garantir que os planos existam
    plans_data = [
        {
            'nome': 'Start',
            'preco_mensal': 49.90, 
            'max_produtos': 50,
            'recursos': {
                'whatsapp': True,
                'cardapio_digital': True,
                'pedidos': True,
                'pdv': True,
            }
        },
        {
            'nome': 'Pro',
            'preco_mensal': 129.90, 
            'max_produtos': 200,
            'recursos': {
                'whatsapp': True,
                'cardapio_digital': True,
                'pedidos': True,
                'pdv': True,
                'kanban': True,
                'mesas': True,
                'equipe': 3
            }
        },
        {
            'nome': 'Elite',
            'preco_mensal': 249.90, 
            'max_produtos': 1000,
            'recursos': {
                'whatsapp': True,
                'cardapio_digital': True,
                'pedidos': True,
                'pdv': True,
                'kanban': True,
                'mesas': True,
                'equipe': 10,
                'ifood': True
            }
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
        print(f"Plano {pd['nome']} {'CRIADO' if created else 'ATUALIZADO'}.")
    
    # Limpar erro anterior (o usuário klsimanrds90 se existir)
    misspelled_email = 'klsimanrds90@gmail.com'
    misspelled_user = User.objects.filter(email=misspelled_email).first()
    if misspelled_user:
        # Deletar a loja do usuário errado para liberar o slug se necessário
        ConfiguracaoLoja.objects.filter(owner=misspelled_user).delete()
        misspelled_user.delete()
        print(f'Usuário incorreto {misspelled_email} removido.')

    # Criar ou pegar usuário CORRETO
    user, created = User.objects.get_or_create(
        email=email,
        defaults={
            'username': email,
            'first_name': 'Klisman RDS',
        }
    )
    if created:
        user.set_password(password)
        user.save()
        print(f'Usuário {email} CRIADO com sucesso.')
    else:
        print(f'Usuário {email} JÁ EXISTIA.')

    # Garantir que tem uma loja
    loja = ConfiguracaoLoja.objects.filter(owner=user).first()
    if not loja:
        # Tentar criar com o slug rds-teste, se falhar tenta rds-sistema
        try:
            loja = ConfiguracaoLoja.objects.create(
                owner=user,
                nome='RDS Sistemas',
                slug='rds-teste',
                whatsapp='5500000000000'
            )
        except:
            loja = ConfiguracaoLoja.objects.create(
                owner=user,
                nome='RDS Sistemas',
                slug='rds-sistema',
                whatsapp='5500000000000'
            )
        print(f'Loja {loja.nome} CRIADA.')
    
    # Aplicar o plano
    loja.plano = plano_start
    loja.plano_tipo = 'START'
    loja.status_assinatura = 'active'
    loja.valido_ate = timezone.now() + timedelta(days=365)
    loja.save()
    print(f'Assinatura da loja {loja.nome} (slug: {loja.slug}) ATUALIZADA para {plano_start.nome} (Ativo)!')
        
except Exception as e:
    import traceback
    traceback.print_exc()
    print(f'Erro: {e}')
"""

# Escape single quotes for shell command
escaped_script = django_script.replace("'", "'\\''")

email = 'klismanrds90@gmail.com'
# Run inside docker container
cmd = f"docker exec -i gerenciador-backend python manage.py shell -c '{escaped_script}'"

print(f"Executando atualização para {email}...")
stdin, stdout, stderr = ssh.exec_command(cmd)

for line in stdout:
    print(line, end='')
for line in stderr:
    print(line, end='', file=sys.stderr)

ssh.close()
print("Processo finalizado.")
