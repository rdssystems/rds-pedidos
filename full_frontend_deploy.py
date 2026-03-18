import os
import paramiko
import zipfile
import stat
import sys

# Ensure correct stdout encoding printing to terminal in Windows
sys.stdout.reconfigure(encoding='utf-8')

HOST = '129.121.45.7'
PORT = 22022
USER = 'root'
PASS = '@Klisman12#'

def create_zip(source_dir, output_zip):
    print(f"Creating zip file from {source_dir}...")
    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(source_dir):
            if 'node_modules' in dirs:
                dirs.remove('node_modules')
            if '.next' in dirs:
                dirs.remove('.next')
            for file in files:
                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, source_dir)
                zipf.write(file_path, arcname)
    print(f"Zip created successfully at {output_zip}")

try:
    zip_path = 'frontend_temp.zip'
    create_zip(r'c:\Users\Klisman rDs\Documents\Gerenciador de Pedidos\frontend', zip_path)
    
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    print("Connecting to VPS...")
    ssh.connect(HOST, port=PORT, username=USER, password=PASS, timeout=10)
    
    sftp = ssh.open_sftp()
    print("Uploading zip to VPS...")
    sftp.put(zip_path, '/root/rds-pedidos/frontend_temp.zip')
    sftp.close()
    
    print("Extracting and rebuilding (this will take about a minute)...")
    cmd = '''
        cd /root/rds-pedidos
        rm -rf frontend/src frontend/public
        unzip -q -o frontend_temp.zip -d frontend
        rm frontend_temp.zip
        docker compose build --no-cache frontend && docker compose up -d frontend
    '''
    
    # Run in foreground and read with replace
    stdin, stdout, stderr = ssh.exec_command(cmd)
    
    # Use .read().decode(errors='replace') to avoid unicode crashes
    out = stdout.read().decode('utf-8', errors='replace')
    err = stderr.read().decode('utf-8', errors='replace')
    
    print("STDOUT:")
    print(out)
    print("STDERR:")
    print(err)

except Exception as e:
    print(f"Error: {e}")
finally:
    ssh.close()
    if os.path.exists(zip_path):
        os.remove(zip_path)
    print("Done!")
