import paramiko
import sys

sys.stdout.reconfigure(line_buffering=True)

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#', timeout=30)
print("Conectado na VPS para preparar o SSL!")

# Script que será executado na VPS quando o DNS propagar
ssl_script = """#!/bin/bash
echo '--- Instalando Certbot ---'
apt-get update
apt-get install -y certbot

echo '--- Solicitando Certificado Let\\'s Encrypt ---'
# Usamos o modo standalone temporário (precisa parar o nginx rapidinho)
docker-compose -f /root/rds-pedidos/docker-compose.yml stop nginx
certbot certonly --standalone -d rdspedidos.com.br -d www.rdspedidos.com.br --non-interactive --agree-tos --email contato@rdspedidos.com.br
docker-compose -f /root/rds-pedidos/docker-compose.yml start nginx

echo '--- Certificado gerado com sucesso! ---'
ls -l /etc/letsencrypt/live/rdspedidos.com.br/
"""

stdin, stdout, stderr = ssh.exec_command(f"echo '{ssl_script}' > /root/rds-pedidos/ativar_ssl.sh && chmod +x /root/rds-pedidos/ativar_ssl.sh")
print("Script 'ativar_ssl.sh' criado na VPS em /root/rds-pedidos/")

ssh.close()
print("\nPronto! Tudo engatilhado.")
