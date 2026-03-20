import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')

print("=== DOCKER PS ===")
stdin, stdout, stderr = ssh.exec_command('docker ps --format "table {{.Names}}\t{{.Status}}"')
print(stdout.read().decode('utf-8'))

print("\n=== CURL LOCALHOST ===")
stdin, stdout, stderr = ssh.exec_command('curl -s -o /dev/null -w "HTTP Status: %{http_code}" http://localhost')
print(stdout.read().decode('utf-8'))

print("\n=== FRONTEND LOGS (last 20) ===")
stdin, stdout, stderr = ssh.exec_command('docker logs rds-frontend --tail 20 2>&1')
print(stdout.read().decode('utf-8'))

print("\n=== BACKEND LOGS (last 20) ===")
stdin, stdout, stderr = ssh.exec_command('docker logs gerenciador-backend --tail 20 2>&1')
print(stdout.read().decode('utf-8'))

print("\n=== NGINX LOGS (last 10) ===")
stdin, stdout, stderr = ssh.exec_command('docker logs gerenciador-nginx --tail 10 2>&1')
print(stdout.read().decode('utf-8'))

ssh.close()
