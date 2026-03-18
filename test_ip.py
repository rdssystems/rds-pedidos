import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')

# Testa via IP
commands = [
    "curl -I http://localhost/login",
    "curl -I http://localhost/reset-password"
]

for cmd in commands:
    print(f"--- RUNNING: {cmd} ---")
    stdin, stdout, stderr = ssh.exec_command(cmd)
    print("STDOUT:", stdout.read().decode())
    print("STDERR:", stderr.read().decode())

ssh.close()
