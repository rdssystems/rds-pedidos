import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')

container_code = """
import os
import django
from django.core.mail import send_mail
from django.conf import settings

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

try:
    subject = 'Teste de Autenticação - RDS Pedidos'
    message = 'Se você recebeu este e-mail, a integração com o Resend e o domínio verificado estão funcionando perfeitamente!'
    # Test sending to the user's gmail
    recipient = 'klismanrds90@gmail.com'
    
    print(f'Enviando de: {settings.DEFAULT_FROM_EMAIL}')
    send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [recipient])
    print('E-mail enviado com sucesso!')
except Exception as e:
    print(f'Erro ao enviar e-mail: {e}')
"""

stdin, stdout, stderr = ssh.exec_command(f'docker exec -i gerenciador-backend python3 -c "{container_code}"')
print(stdout.read().decode())
print(stderr.read().decode())
ssh.close()
