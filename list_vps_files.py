import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    print("Conectado na VPS!")

    print("--- LISTING FILES IN FRONTEND FOLDER ON VPS ---")
    stdin, stdout, stderr = ssh.exec_command("ls -R /root/rds-pedidos/frontend")
    print(stdout.read().decode())
    
except Exception as e:
    print(f"Erro: {e}")
finally:
    ssh.close()
