import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    
    # Check only backend status
    stdin, stdout, stderr = ssh.exec_command('docker ps -a --filter name=gerenciador-backend --format "{{.Names}}: {{.Status}}"')
    status = stdout.read().decode('utf-8').strip()
    print(f"BACKEND_STATUS: {status if status else 'NOT FOUND'}")
    
    # Check if any container is Exited
    stdin, stdout, stderr = ssh.exec_command('docker ps -a --filter status=exited --format "{{.Names}}: {{.Status}}"')
    exited = stdout.read().decode('utf-8').strip()
    print(f"EXITED_CONTAINERS:\n{exited if exited else 'NONE'}")

    # Check for backend logs if it's there
    stdin, stdout, stderr = ssh.exec_command('docker logs gerenciador-backend --tail 20')
    logs = stdout.read().decode('utf-8') + stderr.read().decode('utf-8')
    print(f"\nBACKEND_LOGS:\n{logs}")

except Exception as e:
    print(e)
finally:
    ssh.close()
