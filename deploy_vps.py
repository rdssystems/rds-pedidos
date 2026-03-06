import paramiko
import time
import sys
import os

HOST = '129.121.45.7'
PORT = 22022
USER = 'root'
PASS = 'IF^bS2m1iBy1scdq'

def run_cmd(ssh, cmd):
    print(f"Running: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    # Wait for the command to finish, printing output line by line
    while not stdout.channel.exit_status_ready():
        if stdout.channel.recv_ready():
            print(stdout.channel.recv(1024).decode('utf-8', errors='replace'), end='')
        time.sleep(0.5)

    # Print remaining output
    if stdout.channel.recv_ready():
        print(stdout.channel.recv(1024).decode('utf-8', errors='replace'), end='')

    status = stdout.channel.recv_exit_status()
    err = stderr.read().decode('utf-8', errors='replace')
    if err:
        print(f"STDERR: {err}")
    
    print(f"Exit Status: {status}\n")
    return status

def main():
    print("Conectando na VPS...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=10)
        print("Conectado com sucesso!")
        
        # Check system info
        run_cmd(ssh, "lsb_release -a")
        
        # Install basic tools and Docker if not present
        run_cmd(ssh, "apt-get update")
        run_cmd(ssh, "apt-get install -y docker.io docker-compose git curl unzip python3-paramiko")
        
        # Generate SSH key for GitHub access
        run_cmd(ssh, "if [ ! -f ~/.ssh/id_rsa ]; then ssh-keygen -t rsa -N '' -C 'vps_deploy' -f ~/.ssh/id_rsa; fi")
        
        # Grab the public key to show to the user
        print("Sua chave SSH Publica (caso precise por no GitHub):")
        run_cmd(ssh, "cat ~/.ssh/id_rsa.pub")
        
    except Exception as e:
        print(f"Erro ao conectar: {e}")
    finally:
        ssh.close()

if __name__ == '__main__':
    main()
