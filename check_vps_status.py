import paramiko

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')

# O script precisa listar os containers e ver quando foram criados/reiniciados
stdin, stdout, stderr = ssh.exec_command("docker ps --format '{{.Names}} | {{.Status}} | {{.Image}}'")
print("STDOUT:", stdout.read().decode())
print("STDERR:", stderr.read().decode())
ssh.close()
