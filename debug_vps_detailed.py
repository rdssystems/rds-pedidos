import paramiko
import sys

def run_remote_command(ssh, command):
    print(f"--- Running: {command} ---")
    stdin, stdout, stderr = ssh.exec_command(command)
    out = stdout.read().decode()
    err = stderr.read().decode()
    if out: print(out)
    if err: print(f"ERROR: {err}")
    return out

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    print("Conectado na VPS!")

    # 1. Check container status
    run_remote_command(ssh, "docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")

    # 2. Check logs of the frontend and nginx
    run_remote_command(ssh, "docker logs --tail 50 rds-frontend")
    run_remote_command(ssh, "docker logs --tail 50 gerenciador-nginx")

    # 3. Check system resource usage
    run_remote_command(ssh, "free -m")
    run_remote_command(ssh, "df -h")
    run_remote_command(ssh, "uptime")

    # 4. Try to curl the frontend from within the VPS (to see if Nginx can reach it)
    run_remote_command(ssh, "docker exec gerenciador-nginx curl -I http://frontend:3000/login")

except Exception as e:
    print(f"Falha ao conectar: {e}")
finally:
    ssh.close()
