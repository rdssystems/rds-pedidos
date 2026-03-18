import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')

script = """
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes

user = User.objects.filter(email='klismanrds@gmail.com').first()
if user:
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    print(f'https://app.rdspedidos.com.br/reset-password?uid={uid}&token={token}')
else:
    print("User not found")
"""

stdin, stdout, stderr = ssh.exec_command(f'docker exec -i gerenciador-backend python3 -c "{script}"')
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())
ssh.close()
