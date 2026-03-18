import zipfile
import os
import paramiko

# Zip files
with zipfile.ZipFile('landing.zip', 'w') as z:
    # Files
    files = [
        'src/app/page.tsx',
        'src/app/layout.tsx',
        'src/app/globals.css',
        'package.json',
        'next.config.ts',
        'postcss.config.mjs',
        'Dockerfile',
        'tsconfig.json',
        '.dockerignore'
    ]
    for f in files:
        local = os.path.join('landing-page', f.replace('/', os.sep))
        if os.path.exists(local):
            z.write(local, f)
            
    # Public folder
    public_path = os.path.join('landing-page', 'public')
    for root, dirs, files_in_dir in os.walk(public_path):
        for file in files_in_dir:
            full_path = os.path.join(root, file)
            rel_path = os.path.relpath(full_path, 'landing-page')
            z.write(full_path, rel_path)

# Upload
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')

sftp = ssh.open_sftp()
sftp.put('landing.zip', '/root/rds-pedidos/landing.zip')
sftp.close()

# Unzip on VPS
ssh.exec_command('cd /root/rds-pedidos && unzip -o landing.zip -d landing-page && rm landing.zip')

ssh.close()
print("Done!")
