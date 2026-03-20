import paramiko
import sys
import time

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')

def run(cmd, timeout=300):
    print(f"\n$ {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd, timeout=timeout)
    out = stdout.read().decode('utf-8')
    err = stderr.read().decode('utf-8')
    if out.strip(): print(out)
    if err.strip(): print(f"[STDERR] {err}")
    return out, err

# 1. Uninstall Netdata
print("🗑️ Desinstalando Netdata...")
run('systemctl stop netdata')
run('systemctl disable netdata')
run('apt remove --purge -y netdata netdata-core netdata-plugins-base')
run('rm -rf /etc/netdata /var/lib/netdata /var/log/netdata')

# 2. Install Glances
print("\n🚀 Instalando Glances...")
run('apt update && apt install -y glances python3-pip')
run('pip3 install glances[web] --break-system-packages || pip3 install glances[web]')

# 3. Create a systemd service for Glances (to run in web mode)
print("\n🔧 Configurando serviço do Glances (Web Mode)...")
glances_service = """[Unit]
Description=Glances Monitoring
After=network.target

[Service]
ExecStart=/usr/local/bin/glances -w --port 61208
Restart=always
User=root

[Install]
WantedBy=multi-user.target
"""
run(f"echo '{glances_service}' > /etc/systemd/system/glances.service")
run('systemctl daemon-reload')
run('systemctl enable glances')
run('systemctl start glances')

# 4. Check if it started
time.sleep(3)
run('systemctl status glances | grep "Active:"')

ssh.close()
print("\n🎉 Glances instalado com sucesso na porta 61208!")
