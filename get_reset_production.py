import paramiko
import os

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')

container_code = """
import os
import django
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()
from django.contrib.auth.models import User
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_encode
from django.utils.encoding import force_bytes

user = User.objects.filter(email='klismanrds90@gmail.com').first()
if user:
    token = default_token_generator.make_token(user)
    uid = urlsafe_base64_encode(force_bytes(user.pk))
    print(f'https://app.rdspedidos.com.br/reset-password?uid={uid}&token={token}')
else:
    print('User not found')
"""

# Salva esse código num arquivo temporário no VPS e executa
ssh.exec_command("echo '" + container_code.replace("'", "'\\''") + "' > /tmp/reset_script.py")
stdin, stdout, stderr = ssh.exec_command("docker exec -i gerenciador-backend python3 < /tmp/reset_script.py")

print(stdout.read().decode())
print(stderr.read().decode())
ssh.close()
