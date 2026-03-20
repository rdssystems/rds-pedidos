import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')

def run(cmd, timeout=120):
    print(f"\n$ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if out.strip(): print(out)
    if err.strip(): print(f"[STDERR] {err}")
    return out, err

# Upload new settings.py
print("📤 Uploading updated settings.py with CSRF fix...")
sftp = ssh.open_sftp()
sftp.put(r'c:\Users\Klisman rDs\Documents\Gerenciador de Pedidos\backend\core\settings.py', '/root/rds-pedidos/backend/core/settings.py')
sftp.close()
print("✅ Uploaded!")

# Restart backend
print("\n🔄 Restarting backend container...")
run('docker restart gerenciador-backend')

import time
time.sleep(5)

# Verify
print("\n✅ Verification:")
run('docker ps --format "table {{.Names}}\t{{.Status}}" | grep backend')
run('docker logs gerenciador-backend --tail 20 2>&1')

ssh.close()
print("\n🎉 Backend atualizado com correções de CSRF!")
