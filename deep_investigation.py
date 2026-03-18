import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())

def run_remote_cmd(ssh, cmd):
    stdin, stdout, stderr = ssh.exec_command(cmd)
    return stdout.read().decode('utf-8') + stderr.read().decode('utf-8')

try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    
    print("--- TOP 10 PROCESSOS POR CPU ---")
    print(run_remote_cmd(ssh, 'ps aux --sort=-%cpu | head -n 11'))
    
    print("\n--- TOP 10 PROCESSOS POR MEMÓRIA ---")
    print(run_remote_cmd(ssh, 'ps aux --sort=-%mem | head -n 11'))
    
    print("\n--- PROCESSOS ZUMBIS ---")
    print(run_remote_cmd(ssh, "ps aux | awk '{if ($8 == \"Z\") print $0}'"))
    
    print("\n--- DOCKER STATS (NO-STREAM) ---")
    # Using format to avoid messy output
    print(run_remote_cmd(ssh, 'docker stats --no-stream --format "table {{.Name}}\t{{.CPUPerc}}\t{{.MemUsage}}\t{{.NetIO}}\t{{.PIDs}}"'))

    print("\n--- VERIFICANDO REINICIALIZAÇÕES (DOCKER) ---")
    print(run_remote_cmd(ssh, 'docker ps -a --format "table {{.Names}}\t{{.Status}}\t{{.CreatedAt}}"'))

except Exception as e:
    print(f"Erro: {e}")
finally:
    ssh.close()
