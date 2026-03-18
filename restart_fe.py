import paramiko
import time

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    print("Conectado na VPS!")

    print("--- RESTARTING FRONTEND ---")
    ssh.exec_command("docker restart rds-frontend")
    
    # Wait a bit and check logs
    time.sleep(5)
    
    stdin, stdout, stderr = ssh.exec_command("docker logs rds-frontend")
    print("--- FRONTEND LOGS AFTER RESTART ---")
    print(stdout.read().decode())
    print(stderr.read().decode())
    
except Exception as e:
    print(f"Erro: {e}")
finally:
    ssh.close()
