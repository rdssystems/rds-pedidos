import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    
    # 1. Look for 'returnNaN' in the remote project directory
    print("--- SEARCHING FOR 'returnNaN' IN /root/rds-pedidos ---")
    stdin, stdout, stderr = ssh.exec_command('grep -rn "returnNaN" /root/rds-pedidos')
    print(stdout.read().decode())
    
    # 2. Look for suspicious '/let' and '/sh' in the remote project directory
    print("\n--- SEARCHING FOR suspicious '/let' or '/sh' calls ---")
    stdin, stdout, stderr = ssh.exec_command('grep -rn "/let" /root/rds-pedidos')
    print(stdout.read().decode())

    # 3. Check what's in /root/rds-pedidos now (to see if there's any weird file)
    print("\n--- RECENT FILES IN /root/rds-pedidos ---")
    stdin, stdout, stderr = ssh.exec_command('find /root/rds-pedidos -mmin -60 -type f')
    print(stdout.read().decode())

except Exception as e:
    print(e)
finally:
    ssh.close()
