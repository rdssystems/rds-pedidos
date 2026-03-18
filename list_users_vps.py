import sys
import paramiko

sys.stdout.reconfigure(encoding='utf-8')

try:
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')

    query = """
from django.contrib.auth import get_user_model
User = get_user_model()
users = User.objects.all()
if not users:
    print('Nenhum usuario encontrado.')
else:
    for u in users:
        nome = getattr(u, 'first_name', '') + ' ' + getattr(u, 'last_name', '')
        print(f"ID: {u.id} | Email: {getattr(u, 'email', 'Sem Email')} | Nome: {nome.strip()} | Ativo: {getattr(u, 'is_active', False)} | Admin: {getattr(u, 'is_superuser', False)}")
"""
    # Write the script to a temporary file in the container
    stdin, stdout, stderr = ssh.exec_command('docker exec -i gerenciador-backend python manage.py shell')
    stdin.write(query)
    stdin.channel.shutdown_write()
    
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    
    print("--- Users from Production DB ---")
    
    # Filter out empty lines or interactive python shell noise if any
    for line in out.splitlines():
        if "ID: " in line or "Nenhum" in line:
            print(line)
            
    if err:
        print("Erros (se houver):", err)

except Exception as e:
    print(f"Erro na conexão: {e}")
finally:
    ssh.close()
