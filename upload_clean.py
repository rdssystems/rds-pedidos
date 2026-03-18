import paramiko
import os

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')

sftp = ssh.open_sftp()

files = [
    'src/app/page.tsx',
    'package.json',
    'next.config.ts',
    'postcss.config.mjs',
    'Dockerfile',
    'tsconfig.json',
    '.dockerignore'
]

import posixpath

for f in files:
    local = os.path.join(r'c:\Users\Klisman rDs\Documents\Gerenciador de Pedidos\landing-page', f.replace('/', os.sep))
    remote = posixpath.join('/root/rds-pedidos/landing-page', f)
    
    # Ensure remote directory exists
    remote_dir = posixpath.dirname(remote)
    print(f"Checking directory {remote_dir}...")
    stdin, stdout, stderr = ssh.exec_command(f'mkdir -p {remote_dir}')
    stdout.channel.recv_exit_status() # Wait for it to finish

    print(f"Uploading {local} to {remote}...")
    try:
        # Delete if exists to be safe
        try:
            sftp.remove(remote)
        except:
            pass
        sftp.put(local, remote)
        print("OK")
    except Exception as e:
        print(f"FAILED {f}: {e}")

sftp.close()
ssh.close()
print("Done!")
