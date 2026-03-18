import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    print("Conectado na VPS!")

    print("--- BACKEND LOGS ---")
    stdin, stdout, stderr = ssh.exec_command("docker logs --tail 100 gerenciador-backend")
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(out)
    print(err)
    
except Exception as e:
    print(f"Erro: {e}")
finally:
    ssh.close()
