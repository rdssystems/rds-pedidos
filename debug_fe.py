import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    print("Conectado na VPS!")

    # Focus on the frontend logs with more context
    stdin, stdout, stderr = ssh.exec_command("docker logs --tail 100 rds-frontend")
    print("--- FRONTEND LOGS ---")
    out = stdout.read().decode()
    err = stderr.read().decode()
    print(out)
    print(err)

    # Try to search for the string in the built files inside the container
    # Next.js standalone output is usually in .next/standalone
    stdin, stdout, stderr = ssh.exec_command("docker exec rds-frontend grep -r 'returnNaN' .")
    print("--- GREP INSIDE CONTAINER ---")
    print(stdout.read().decode())
    
except Exception as e:
    print(f"Erro: {e}")
finally:
    ssh.close()
