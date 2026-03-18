import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    stdin, stdout, stderr = ssh.exec_command('cat /root/rds-pedidos/frontend/src/app/globals.css')
    print("VPS globals.css:")
    print(stdout.read().decode('utf-8'))
    
    stdin, stdout, stderr = ssh.exec_command('docker exec rds-frontend ls -la /app/.next/static/css')
    print("\nCSS dir on VPS container:")
    print(stdout.read().decode('utf-8'))
    
except Exception as e:
    print(e)
finally:
    ssh.close()
