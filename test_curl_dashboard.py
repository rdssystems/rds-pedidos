import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')

# Testa /dashboard
commands = [
    "curl -I -L http://localhost/dashboard -H 'Host: app.rdspedidos.com.br'"
]

for cmd in commands:
    print(f"--- RUNNING: {cmd} ---")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("STDOUT:", stdout.read().decode())
    print("STDERR:", stderr.read().decode())

ssh.close()
