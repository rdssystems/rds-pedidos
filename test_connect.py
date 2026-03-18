import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    print("Conectado na VPS!")

    print("--- PINGING BACKED FROM FRONTEND ---")
    stdin, stdout, stderr = ssh.exec_command("docker exec rds-frontend ping -c 4 backend")
    print(stdout.read().decode())
    print(stderr.read().decode())
    
    print("--- CURLING BACKEND FROM FRONTEND ---")
    stdin, stdout, stderr = ssh.exec_command("docker exec rds-frontend curl -I http://backend:8000/api/")
    print(stdout.read().decode())
    print(stderr.read().decode())

except Exception as e:
    print(f"Erro: {e}")
finally:
    ssh.close()
