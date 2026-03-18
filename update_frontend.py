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
    local_path = os.path.normpath(r'c:\Users\Klisman rDs\Documents\Gerenciador de Pedidos\frontend\src\components\admin\AdminLayout.tsx')
    remote_path = '/root/rds-pedidos/frontend/src/components/admin/AdminLayout.tsx'
    
    print(f"Uploading AdminLayout.tsx to VPS...")
    sftp.put(local_path, remote_path)
    sftp.close()
    
    # Rebuild and restart frontend on VPS
    print("Rebuilding frontend on VPS...")
    cmd = 'cd /root/rds-pedidos && docker compose build frontend && docker compose up -d frontend'
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
    print("Done!")
