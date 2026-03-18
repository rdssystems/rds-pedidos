import paramiko
import os
import sys

# Ensure correct stdout encoding printing to terminal in Windows
sys.stdout.reconfigure(encoding='utf-8')

HOST = '129.121.45.7'
PORT = 22022
USER = 'root'
PASS = '@Klisman12#'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    print("Connecting to VPS...")
    ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=10)
    
    sftp = ssh.open_sftp()
    
    # 1. Upload globals.css
    local_css_path = os.path.normpath(r'c:\Users\Klisman rDs\Documents\Gerenciador de Pedidos\frontend\src\app\globals.css')
    remote_css_path = '/root/rds-pedidos/frontend/src/app/globals.css'
    print(f"Uploading globals.css to VPS...")
    sftp.put(local_css_path, remote_css_path)
    
    # 2. Upload page.tsx for landing-page
    local_lp_path = os.path.normpath(r'c:\Users\Klisman rDs\Documents\Gerenciador de Pedidos\landing-page\src\app\page.tsx')
    remote_lp_path = '/root/rds-pedidos/landing-page/src/app/page.tsx'
    print(f"Uploading landing-page page.tsx to VPS...")
    sftp.put(local_lp_path, remote_lp_path)

    sftp.close()
    
    # Rebuild and restart frontend and landing-page on VPS
    print("Rebuilding frontend and landing-page on VPS...")
    cmd = 'cd /root/rds-pedidos && docker compose build frontend landing-page && docker compose up -d frontend landing-page'
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    print("STDOUT:")
    for line in stdout:
        print(line, end='')
        
    print("STDERR:")
    for line in stderr:
        print(line, end='')

except Exception as e:
    print(f"Error: {e}")
finally:
    ssh.close()
    print("Updates pushed and containers rebuilt successfully!")
