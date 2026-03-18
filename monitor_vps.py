import paramiko
import time
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    for i in range(4):
        print(f"--- CHECK {i+1} ---")
        stdin, stdout, stderr = ssh.exec_command('uptime')
        print(f"Uptime: {stdout.read().decode().strip()}")
        stdin, stdout, stderr = ssh.exec_command('ps aux | grep defunct | grep -v grep | wc -l')
        print(f"Zombies: {stdout.read().decode().strip()}")
        time.sleep(10)
except Exception as e:
    print(e)
finally:
    ssh.close()
