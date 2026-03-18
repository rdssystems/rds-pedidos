import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    
    # 1. Identity parents of zombies (Z status)
    print("--- PARENT PROCESSES OF ZOMBIES ---")
    # cmd finds all processes with Z status children, gets their ppid (parents), sorts and counts.
    cmd = "ps -eo ppid,stat | grep Z | awk '{print $1}' | sort | uniq -c | sort -nr"
    stdin, stdout, stderr = ssh.exec_command(cmd)
    zombie_parents = stdout.read().decode().strip()
    print(f"COUNT PPID\n{zombie_parents}")

    # 2. Detail each parent
    if zombie_parents:
        for line in zombie_parents.split('\n'):
            line_parts = line.strip().split()
            if len(line_parts) >= 2:
                ppid = line_parts[1]
                print(f"\n--- PARENT {ppid} ---")
                stdin, stdout, stderr = ssh.exec_command(f"ps -fp {ppid}")
                print(stdout.read().decode())
                stdin, stdout, stderr = ssh.exec_command(f"docker ps -q | xargs -n1 docker inspect --format '{{.State.Pid}} {{.Name}}' | grep {ppid} || echo 'Not a container root PID or not found in Docker'")
                print(stdout.read().decode().strip())


except Exception as e:
    print(e)
finally:
    ssh.close()
