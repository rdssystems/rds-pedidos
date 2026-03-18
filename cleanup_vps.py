import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    print("Conectado na VPS!")

    print("--- KILLING ROGUE PROCESS ---")
    ssh.exec_command("kill -9 184044")
    
    print("--- STOPPING ALL CONTAINERS ---")
    ssh.exec_command("cd /root/rds-pedidos && docker-compose down")
    
    print("--- REMOVING FRONTEND IMAGE ---")
    ssh.exec_command("docker rmi rds-pedidos-frontend") # Check name first or just prune
    ssh.exec_command("docker image prune -af")
    
    print("--- CLEANING FOLDER ---")
    ssh.exec_command("rm /root/rds-pedidos/frontend/.next/uDVdUfhl") # Just in case it's on the host volume (but it shouldn't be)
    
    print("--- CHECKING FOR OTHER ROGUE PROCESSES ---")
    stdin, stdout, stderr = ssh.exec_command("ps aux | grep -v grep | grep -E 'uDVdUfhl|miner|kin'")
    print(stdout.read().decode())
    
except Exception as e:
    print(f"Erro: {e}")
finally:
    ssh.close()
