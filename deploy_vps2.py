import paramiko
import os
import tarfile
from stat import S_ISDIR

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

def create_tar(tar_name, source_dirs):
    print(f"Criando {tar_name}...")
    def filter_func(tarinfo):
        exclude = ['node_modules', '.next', 'venv', '__pycache__', '.git', '.dockerignore', '.gitignore', 'app.tar.gz']
        if any(ex in tarinfo.name for ex in exclude):
            return None
        return tarinfo

    with tarfile.open(tar_name, "w:gz") as tar:
        for folder in source_dirs:
            if os.path.exists(folder):
                print(f"Adicionando {folder}...")
                tar.add(folder, arcname=os.path.basename(folder), filter=filter_func)
    print("Tar criado.")

def main():
    # 1. Zip the required files
    files_to_pack = [
        'backend',
        'frontend',
        'nginx',
        'docker-compose.yml',
        '.env',
        'production.env'
    ] # Excluding 'data' and 'evolution_store' to keep it light
    create_tar('app.tar.gz', files_to_pack)

    print("Conectando na VPS...")
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    try:
        ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=10)
        print("Conectado com sucesso!")
        
        print("Iniciando upload do app.tar.gz...")
        sftp = ssh.open_sftp()
        sftp.put('app.tar.gz', '/root/rds-pedidos/app.tar.gz')
        sftp.close()
        print("Upload concluido!")
        
        run_cmd(ssh, "cd /root/rds-pedidos && tar -xzf app.tar.gz && mv production.env .env")
        print("Arquivos extraídos e .env configurado para produção.")
        
        print("Building docker...")
        # Restart
        run_cmd(ssh, "cd /root/rds-pedidos && docker-compose build && docker-compose up -d")
        
    except Exception as e:
        print(f"Erro ao conectar: {e}")
    finally:
        ssh.close()

if __name__ == '__main__':
    main()
