import paramiko
import os
import sys

sys.stdout.reconfigure(line_buffering=True)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#', timeout=10)
print("Conectado na VPS!")

sftp = ssh.open_sftp()

base_local = r'C:\Users\Klisman rDs\Documents\Gerenciador de Pedidos'
base_remote = '/root/rds-pedidos'

files = [
    ('production.env', '.env'),
    ('docker-compose.yml', 'docker-compose.yml'),
    ('nginx/nginx.conf', 'nginx/nginx.conf'),
    ('landing-page/src/app/page.tsx', 'landing-page/src/app/page.tsx'),
    ('landing-page/package.json', 'landing-page/package.json'),
    ('landing-page/next.config.ts', 'landing-page/next.config.ts'),
    ('landing-page/postcss.config.mjs', 'landing-page/postcss.config.mjs'),
    ('landing-page/Dockerfile', 'landing-page/Dockerfile'),
    ('landing-page/tsconfig.json', 'landing-page/tsconfig.json'),
    ('landing-page/.dockerignore', 'landing-page/.dockerignore'),
    ('landing-page/public/assets/cardapio-page.png', 'landing-page/public/assets/cardapio-page.png'),
    ('landing-page/public/assets/configuracoes.png', 'landing-page/public/assets/configuracoes.png'),
    ('landing-page/public/assets/configuracoes2.png', 'landing-page/public/assets/configuracoes2.png'),
    ('landing-page/public/assets/configuracoes3.png', 'landing-page/public/assets/configuracoes3.png'),
    ('landing-page/public/assets/equipe.png', 'landing-page/public/assets/equipe.png'),
    ('landing-page/public/assets/whatsapp.png', 'landing-page/public/assets/whatsapp.png'),
    ('landing-page/public/assets/Cardapio.png', 'landing-page/public/assets/Cardapio.png'),
    ('frontend/src/context/BillingContext.tsx', 'frontend/src/context/BillingContext.tsx'),
    ('frontend/src/app/(protected)/dashboard/page.tsx', 'frontend/src/app/(protected)/dashboard/page.tsx'),
    ('frontend/src/app/(protected)/settings/team/page.tsx', 'frontend/src/app/(protected)/settings/team/page.tsx'),
    ('frontend/src/components/admin/AdminLayout.tsx', 'frontend/src/components/admin/AdminLayout.tsx'),
    ('backend/core/views.py', 'backend/core/views.py'),
    ('backend/core/services.py', 'backend/core/services.py'),
    ('backend/core/serializers.py', 'backend/core/serializers.py'),
    ('frontend/src/app/(protected)/settings/whatsapp/page.tsx', 'frontend/src/app/(protected)/settings/whatsapp/page.tsx'),
]

for local_name, remote_name in files:
    local_path = os.path.join(base_local, local_name)
    remote_path = base_remote + '/' + remote_name
    if os.path.exists(local_path):
        print(f'Uploading {local_name}...', end=' ')
        try:
            sftp.put(local_path, remote_path)
            print('OK')
        except Exception as e:
            print(f'ERROR: {e}')
    else:
        print(f'SKIP: {local_name}')

sftp.close()

# Verify .env was uploaded
print("\nVerificando .env na VPS:")
stdin, stdout, stderr = ssh.exec_command('head -8 /root/rds-pedidos/.env')
out = stdout.read().decode()
print(out)

ssh.close()
print("Upload completo!")
