import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    
    print("--- DOCKER PS ---")
    stdin, stdout, stderr = ssh.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}"')
    print(stdout.read().decode('utf-8'))
    
    print("\n--- FRONTEND LOGS (last 50 lines) ---")
    stdin, stdout, stderr = ssh.exec_command('docker logs rds-frontend --tail 50')
    print(stdout.read().decode('utf-8'))
    print(stderr.read().decode('utf-8'))

    print("\n--- NGINX LOGS (last 50 lines) ---")
    stdin, stdout, stderr = ssh.exec_command('docker logs gerenciador-nginx --tail 50')
    print(stdout.read().decode('utf-8'))
    print(stderr.read().decode('utf-8'))

    print("\n--- BACKEND LOGS (last 50 lines) ---")
    stdin, stdout, stderr = ssh.exec_command('docker logs gerenciador-backend --tail 50')
    print(stdout.read().decode('utf-8'))
    print(stderr.read().decode('utf-8'))

except Exception as e:
    print(f"Error: {e}")
finally:
    ssh.close()
