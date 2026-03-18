import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')

container_code = """
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from django.contrib.auth.models import User
users = User.objects.all().values_list('username', 'email')
for u in users:
    print(f'User: {u[0]}, Email: {u[1]}')
"""

stdin, stdout, stderr = ssh.exec_command(f"docker exec -i gerenciador-backend python3 -c \"{container_code}\"")
print(stdout.read().decode())
print(stderr.read().decode())
ssh.close()
