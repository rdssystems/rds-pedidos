import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    
    print("--- DOCKER PS (STATUS REAL) ---")
    stdin, stdout, stderr = ssh.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}"')
    print(stdout.read().decode())
    
    print("\n--- DOCKER PS -A (ALL) ---")
    stdin, stdout, stderr = ssh.exec_command('docker ps -a --format "table {{.Names}}\t{{.Status}}"')
    print(stdout.read().decode())
    
except Exception as e:
    print(e)
finally:
    ssh.close()
