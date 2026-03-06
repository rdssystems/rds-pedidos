import paramiko

HOST = '129.121.45.7'
PORT = 22022
USER = 'root'
PASS = 'IF^bS2m1iBy1scdq'

def run_cmd(ssh, cmd):
    print(f"Running: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    for line in iter(stdout.readline, ""):
        print(line, end="")
    
    status = stdout.channel.recv_exit_status()
    err = stderr.read().decode('utf-8', errors='replace')
    if err:
        print(f"STDERR: {err}")
    return status

def main():
    print("Conectando na VPS...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=10)
        print("Conectado com sucesso!")
        
        # O Ubuntu installou o docker-compose velho (com traco)
        print("Subindo os containers...")
        run_cmd(ssh, "cd /root/rds-pedidos && docker-compose build && docker-compose up -d")
        
    except Exception as e:
        print(f"Erro ao conectar: {e}")
    finally:
        ssh.close()

if __name__ == '__main__':
    main()
