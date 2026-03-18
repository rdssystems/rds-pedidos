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
    
    # 1. Look for all zombie parent processes
    print("--- PROCESSOS ZUMBIS (DETALHADO) ---")
    print(run_remote_cmd(ssh, "ps -ef | grep 'defunct' | grep -v grep"))
    
    # 2. Check parents of those zombies
    print("\n--- PARENTS OF ZOMBIES ---")
    print(run_remote_cmd(ssh, "ps -ef | awk '$8==\"Z\" {print $3}' | sort -u | xargs -r ps -p"))

    # 3. Check docker stats again with name and full info
    print("\n--- DOCKER STATS (Nomes, CPU, RAM) ---")
    # Capturing into a variable to avoid truncation by the terminal if possible
    stats = run_remote_cmd(ssh, "docker stats --no-stream --format '{{.Name}}: CPU={{.CPUPerc}}, MEM={{.MemUsage}}, NetIO={{.NetIO}}'")
    print(stats)

    # 4. Check system dmesg for OOM killer (Out of Memory)
    print("\n--- DMESG OOM CHECK ---")
    print(run_remote_cmd(ssh, "dmesg | grep -i oom | tail -n 5"))

    # 5. List all running containers and their UPTIME specifically
    print("\n--- CONTAINER UPTIME ---")
    print(run_remote_cmd(ssh, "docker ps --format 'table {{.Names}}\t{{.Status}}'"))

except Exception as e:
    print(f"Erro: {e}")
finally:
    ssh.close()
