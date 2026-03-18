import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    print("Conectado!")
    # Use find + grep to avoid grep command getting stuck with too many arguments
    stdin, stdout, stderr = ssh.exec_command("docker exec rds-frontend grep -r 'returnNaN' .")
    print("--- FRONTEND GREP ---")
    print(stdout.read().decode())
    print(stderr.read().decode())
    
except Exception as e:
    print(e)
finally:
    ssh.close()
