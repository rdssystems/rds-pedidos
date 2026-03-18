import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    print("Conectado!")
    stdin, stdout, stderr = ssh.exec_command('docker inspect rds-frontend --format "{{.Config.Image}} {{.Config.Cmd}} {{.Config.Entrypoint}}"')
    print("--- FRONTEND INSPECT ---")
    print(stdout.read().decode())
    
    stdin, stdout, stderr = ssh.exec_command('docker inspect gerenciador-backend --format "{{.Config.Image}} {{.Config.Cmd}} {{.Config.Entrypoint}}"')
    print("--- BACKEND INSPECT ---")
    print(stdout.read().decode())
    
except Exception as e:
    print(e)
finally:
    ssh.close()
