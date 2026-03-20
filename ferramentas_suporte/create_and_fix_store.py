import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')

def run(cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    o = stdout.read().decode('utf-8')
    e = stderr.read().decode('utf-8')
    return o, e

# Direct script execution inside shell
script = """
from core.models import ConfiguracaoLoja, PerfilUsuarioLoja, UserProfile
from django.contrib.auth.models import User
from django.utils import timezone
from django.utils.text import slugify

u = User.objects.filter(username='klismanrds').first()
if u:
    s = ConfiguracaoLoja.objects.filter(owner=u).first()
    if not s:
        print('Creating new store for klismanrds...')
        s = ConfiguracaoLoja.objects.create(
            owner=u,
            nome='Minha Loja RDS',
            slug=slugify('Minha Loja RDS'),
            ativa=True,
            status_assinatura='active',
            plano_tipo='ELITE',
            valido_ate=timezone.now() + timezone.timedelta(days=365)
        )
        # Add profile
        PerfilUsuarioLoja.objects.get_or_create(user=u, loja=s, role='owner')
        # Ensure user is verified to allow login
        prof, _ = UserProfile.objects.get_or_create(user=u)
        prof.is_verified = True
        prof.save()
        u.is_active = True
        u.save()
        print(f'Loja {s.nome} (slug: {s.slug}) criada e ativada como ELITE!')
    else:
        print(f'Store {s.nome} already exists. Activating...')
        s.status_assinatura = 'active'
        s.plano_tipo = 'ELITE'
        s.valido_ate = timezone.now() + timezone.timedelta(days=365)
        s.save()
        print('Subscription FIXED!')
else:
    print('User klismanrds not found!')
"""

# Format script for docker exec
cmd = f"docker exec gerenciador-backend python manage.py shell -c \"{script.replace('\\n', ' ').strip()}\""
print(f"Executando: {cmd}")
out, err = run(cmd)
print(out)
if err: print(f"Error: {err}")

ssh.close()
