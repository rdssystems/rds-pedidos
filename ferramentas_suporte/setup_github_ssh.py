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

# 1. Generate SSH key (if it doesn't exist)
print("🔑 Gerando chave SSH...")
run('ls ~/.ssh/id_ed25519.pub 2>/dev/null || (ssh-keygen -t ed25519 -C "vps-rds-pedidos" -f ~/.ssh/id_ed25519 -N "")')

# 2. Get Public Key
print("\n📜 CHAVE PÚBLICA (COPIE ABAIXO):")
pub_key, _ = run('cat ~/.ssh/id_ed25519.pub')
print("\n" + "="*50)
print(pub_key.strip())
print("="*50 + "\n")

# 3. Update Git Remote to SSH
print("\n🔗 Atualizando URL do repositório para SSH...")
run('cd /root/rds-pedidos && git remote set-url origin git@github.com:rdssystems/rds-pedidos.git')
run('cd /root/rds-pedidos && git remote -v')

# 4. Add github.com to known_hosts to avoid interactive prompt
print("\n🛡️ Adicionando github.com aos hosts conhecidos...")
run('mkdir -p ~/.ssh && ssh-keyscan -t ed25519 github.com >> ~/.ssh/known_hosts')

ssh.close()
