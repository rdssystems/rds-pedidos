import paramiko
import os
import sys

sys.stdout.reconfigure(line_buffering=True)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#', timeout=30)
print("Conectado!")

transport = ssh.get_transport()
transport.set_keepalive(10)

sftp = ssh.open_sftp()

# Upload next.config.ts and docker-compose.yml
files = [
    ('frontend/next.config.ts', 'frontend/next.config.ts'),
    ('docker-compose.yml', 'docker-compose.yml'),
    ('nginx/nginx.conf', 'nginx/nginx.conf'),
]

for l, r in files:
    lp = os.path.join(r'C:\Users\Klisman rDs\Documents\Gerenciador de Pedidos', l)
    rp = f'/root/rds-pedidos/{r}'
    print(f'Uploading {l}... ', end='')
    sftp.put(lp, rp)
    print('OK')

sftp.close()

# Rebuild containers using DOCKER COMPOSE (plugin)
print("Rebuilding containers (Docker Compose V2)...")
stdin, stdout, stderr = ssh.exec_command('cd /root/rds-pedidos && docker compose up -d --build 2>&1', timeout=600)

for line in iter(stdout.readline, ''):
    print(line, end='')
    sys.stdout.flush()

exit_code = stdout.channel.recv_exit_status()
print(f"\nExit code: {exit_code}")

# Status
print("\nStatus final:")
stdin, stdout, stderr = ssh.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"', timeout=30)
print(stdout.read().decode())

ssh.close()
print("DONE")
