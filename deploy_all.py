import zipfile
import os
import paramiko

# Files/folders to include: (local_path, remote_path_relative_to_zip_root)
to_include = [
    ('production.env', '.env'),
    ('docker-compose.yml', 'docker-compose.yml'),
    ('nginx/nginx.conf', 'nginx/nginx.conf'),
    ('landing-page', 'landing-page'), # Zip the whole folder
    ('frontend', 'frontend'),       # Zip the whole folder
    ('backend', 'backend'),         # Zip the whole folder
]

# Exclude list
exclude_patterns = ['.pyc', '.git', '.next', 'node_modules', '__pycache__', 'project.zip']

def should_exclude(path):
    for pattern in exclude_patterns:
        if pattern in path:
            return True
    return False

# Zip everything
print("Creating project.zip...")
with zipfile.ZipFile('project.zip', 'w', zipfile.ZIP_DEFLATED) as z:
    for local_root_path, remote_dest_prefix in to_include:
        if not os.path.exists(local_root_path):
            print(f"SKIP: {local_root_path} (not found)")
            continue
            
        if os.path.isfile(local_root_path):
            z.write(local_root_path, remote_dest_prefix.replace('\\', '/'))
        else:
            for root, dirs, files in os.walk(local_root_path):
                if should_exclude(root): continue
                for file in files:
                    if should_exclude(file): continue
                    
                    local_full_path = os.path.join(root, file)
                    # Calculate path relative to the local_root_path
                    rel_path = os.path.relpath(local_full_path, os.path.dirname(local_root_path))
                    archive_name = rel_path.replace('\\', '/')
                    
                    z.write(local_full_path, archive_name)

# Upload
print("Uploading to VPS...")
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')

sftp = ssh.open_sftp()
sftp.put('project.zip', '/root/rds-pedidos/project.zip')
sftp.close()

# Unzip on VPS
print("Cleaning VPS folders...")
ssh.exec_command('cd /root/rds-pedidos && rm -rf frontend landing-page backend nginx')

print("Unzipping on VPS...")
stdin, stdout, stderr = ssh.exec_command('cd /root/rds-pedidos && unzip -o project.zip && rm project.zip')
print(stdout.read().decode())
print(stderr.read().decode())

# Restart
print("Rebuilding and starting ALL containers on VPS. This may take several minutes...")
stdin, stdout, stderr = ssh.exec_command('cd /root/rds-pedidos && docker-compose build --no-cache && docker-compose up -d --force-recreate')

# Wait and print output
for line in iter(stdout.readline, ""):
    print(line, end="")

exit_status = stdout.channel.recv_exit_status()
if exit_status == 0:
    print("\n✅ Full Clean Deploy completed successfully!")
else:
    print("\n❌ Error during deploy. Stderr:")
    for line in iter(stderr.readline, ""):
        print(line, end="")

ssh.close()
print("Done! Check the site.")
