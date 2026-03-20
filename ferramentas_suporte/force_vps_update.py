import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')

def run(cmd):
    print(f"\n$ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    o = stdout.read().decode('utf-8')
    e = stderr.read().decode('utf-8')
    if o: print(o)
    if e: print(e)
    return o, e

# 1. Force Git Sync
print("🔄 Syncing git repository...")
run("cd /root/rds-pedidos && git fetch origin main && git reset --hard origin/main")

# 2. Restart backend to be 100% sure
print("\n🚀 Restarting backend container...")
run("docker restart gerenciador-backend")

# 3. Check code again
print("\n🔍 Checking verify results in views.py...")
run("head -n 510 /root/rds-pedidos/backend/core/views.py | tail -n 20")

ssh.close()
