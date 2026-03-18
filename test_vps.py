import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')

# Test as rdspedidos.com.br
print("Testing as rdspedidos.com.br...")
stdin, stdout, stderr = ssh.exec_command('docker exec gerenciador-nginx curl -s -H "Host: rdspedidos.com.br" http://localhost/')
out = stdout.read().decode()
if "RDS Pedidos" in out:
    print("MATCH: RDS Pedidos found on rdspedidos.com.br")
else:
    print("NO MATCH: RDS Pedidos NOT found on rdspedidos.com.br")
    if "White-Label" in out:
        print("MATCH: White-Label (Placeholder) found instead!")

# Test as app.rdspedidos.com.br
print("\nTesting as app.rdspedidos.com.br...")
stdin, stdout, stderr = ssh.exec_command('docker exec gerenciador-nginx curl -s -H "Host: app.rdspedidos.com.br" http://localhost/')
out = stdout.read().decode()
if "White-Label" in out:
    print("MATCH: White-Label (App Home) found on app subdomain")
else:
    print("NO MATCH: White-Label NOT found on app subdomain")

ssh.close()
