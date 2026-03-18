import paramiko
import sys

sys.stdout.reconfigure(encoding='utf-8')

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
try:
    ssh.connect('129.121.45.7', port=22022, username='root', password='@Klisman12#')
    
    # Check for 'returnNaN' in the frontend container
    print("--- SEARCHING 'returnNaN' in rds-frontend container ---")
    stdin, stdout, stderr = ssh.exec_command("docker exec rds-frontend grep -rn 'returnNaN' /app")
    out = stdout.read().decode()
    print(f"RESULTS:\n{out if out else 'NOT FOUND'}")
    
    # Check for 'let' and 'sh' as standalone binaries or in code
    print("\n--- SEARCHING FOR suspicious 'sh' or 'let' calls in container code ---")
    stdin, stdout, stderr = ssh.exec_command("docker exec rds-frontend grep -rn 'exec(\"let' /app")
    out = stdout.read().decode()
    print(f"RESULTS (exec let):\n{out if out else 'NOT FOUND'}")

    stdin, stdout, stderr = ssh.exec_command("docker exec rds-frontend grep -rn 'exec(\"sh' /app")
    out = stdout.read().decode()
    print(f"RESULTS (exec sh):\n{out if out else 'NOT FOUND'}")

except Exception as e:
    print(e)
finally:
    ssh.close()
