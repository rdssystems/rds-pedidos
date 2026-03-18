import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

HOST = '129.121.45.7'
PORT = 22022
USER = 'root'
PASS = '@Klisman12#'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

try:
    ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=10)
    print("Conectado com sucesso na VPS!")
    
    # 1. Check all containers
    print("\n--- TODOS OS CONTAINERS (docker ps -a) ---")
    stdin, stdout, stderr = ssh.exec_command('docker ps -a')
    print(stdout.read().decode('utf-8'))
    
    # 2. Check for backend specifically
    print("\n--- BUSCANDO POR 'backend' ---")
    stdin, stdout, stderr = ssh.exec_command('docker ps -a | grep backend')
    print(stdout.read().decode('utf-8'))

    # 3. Check logs of frontend to see errors
    print("\n--- LOGS DO FRONTEND (ERROS) ---")
    stdin, stdout, stderr = ssh.exec_command('docker logs rds-frontend --tail 50')
    print(stdout.read().decode('utf-8', errors='replace'))
    
    # 4. Check system resources (CPU/IO)
    print("\n--- TOP (uma leitura) ---")
    stdin, stdout, stderr = ssh.exec_command('top -bn1 | head -n 20')
    print(stdout.read().decode('utf-8'))


except Exception as e:
    print(f"Erro: {e}")
finally:
    ssh.close()
