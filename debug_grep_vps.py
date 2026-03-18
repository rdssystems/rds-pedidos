import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    print("Conectado na VPS!")

    # Search in the whole rds-pedidos folder on the host
    print("--- SEARCHING ON VPS HOST ---")
    stdin, stdout, stderr = ssh.exec_command("grep -r 'returnNaN' /root/rds-pedidos")
    print(stdout.read().decode())
    
    # Search for /dev/let too
    print("--- SEARCHING FOR /dev/let ---")
    stdin, stdout, stderr = ssh.exec_command("grep -r '/dev/let' /root/rds-pedidos")
    print(stdout.read().decode())

    # Check nginx.conf on VPS
    print("--- NGINX.CONF ON VPS ---")
    stdin, stdout, stderr = ssh.exec_command("cat /root/rds-pedidos/nginx/nginx.conf")
    print(stdout.read().decode())
    
except Exception as e:
    print(f"Erro: {e}")
finally:
    ssh.close()
