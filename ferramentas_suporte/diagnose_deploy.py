import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')

# Check if the repo was cloned
print("=== CHECK IF REPO EXISTS ===")
stdin, stdout, stderr = ssh.exec_command('ls -la /root/rds-pedidos 2>&1')
print(stdout.read().decode('utf-8'))

print("=== CHECK DISK SPACE ===")
stdin, stdout, stderr = ssh.exec_command('df -h /')
print(stdout.read().decode('utf-8'))

print("=== CHECK DOCKER IMAGES ===")
stdin, stdout, stderr = ssh.exec_command('docker images')
print(stdout.read().decode('utf-8'))

print("=== CHECK GIT STATUS ===")
stdin, stdout, stderr = ssh.exec_command('cd /root/rds-pedidos && git log --oneline -1 2>&1')
print(stdout.read().decode('utf-8'))

ssh.close()
