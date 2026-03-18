import paramiko

HOST = '129.121.45.7'
PORT = 22022
USER = 'root'
PASS = '@Klisman12#'

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=10)
    
    # Run migrations on VPS
    cmd = 'cd /root/rds-pedidos && docker compose exec -T backend python manage.py migrate'
    print(f"Running: {cmd}")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    print("STDOUT:")
    for line in stdout:
        print(line, end='')
        
    print("STDERR:")
    for line in stderr:
        print(line, end='')
        
    # Also collect static files just in case
    cmd2 = 'cd /root/rds-pedidos && docker compose exec -T backend python manage.py collectstatic --noinput'
    stdin2, stdout2, stderr2 = ssh.exec_command(cmd2)
    print("STDOUT STATIC:")
    for line in stdout2:
        print(line, end='')
finally:
    ssh.close()
