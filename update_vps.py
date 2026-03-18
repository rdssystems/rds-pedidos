import paramiko
import os
import sys

sys.stdout.reconfigure(line_buffering=True)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#', timeout=10)
print("Conectado na VPS!")

# Build and Restart commands
commands = [
    'cd /root/rds-pedidos && docker compose build frontend',
    'cd /root/rds-pedidos && docker compose up -d backend frontend nginx'
]

for cmd in commands:
    print(f"Running: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    # Print real-time output
    for line in stdout:
        print(line, end='')
    
    for line in stderr:
        print(line, end='', file=sys.stderr)

ssh.close()
print("Comandos executados com sucesso!")
