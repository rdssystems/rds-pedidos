import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    
    print("--- DOCKER CONTAINER PIDs ---")
    stdin, stdout, stderr = ssh.exec_command("docker ps -q | xargs -n1 docker inspect --format '{{.State.Pid}} {{.Name}}'")
    print(stdout.read().decode())
    
    print("--- ZOMBIE PARENT TREE (PPID 227535) ---")
    stdin, stdout, stderr = ssh.exec_command("ps -fo pid,ppid,user,stat,comm,args -p 227535")
    print(stdout.read().decode())

except Exception as e:
    print(e)
finally:
    ssh.close()
