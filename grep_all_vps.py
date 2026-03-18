import paramiko
import sys

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    print("Conectado!")
    # Only search in likely places first to avoid getting stuck
    stdin, stdout, stderr = ssh.exec_command("grep -r 'returnNaN' /root /tmp /var/tmp")
    print("--- SEARCH RESULT ---")
    print(stdout.read().decode())
    print(stderr.read().decode())
    
except Exception as e:
    print(e)
finally:
    ssh.close()
