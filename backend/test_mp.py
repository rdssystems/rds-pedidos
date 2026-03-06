import requests
import json
import os
import sys

sys.path.append(os.path.join(os.getcwd(), 'backend'))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
import django
django.setup()

from django.conf import settings

headers = {
    'Authorization': f'Bearer {settings.MERCADO_PAGO_ACCESS_TOKEN}',
    'Content-Type': 'application/json'
}

print("=== Consultando Assinatura/Preapproval ===")
try:
    res = requests.get(
        "https://api.mercadopago.com/preapproval/197267198-a24cff1d-c507-4ea2-95c1-f2dbb5dfec3f",
        headers=headers
    )
    print(f"Status preapproval 1: {res.status_code}")
    print(json.dumps(res.json(), indent=2))
except Exception as e:
    print(e)

print("\n=== Consultando Preference ===")
try:
    res = requests.get(
        "https://api.mercadopago.com/checkout/preferences/197267198-a24cff1d-c507-4ea2-95c1-f2dbb5dfec3f",
        headers=headers
    )
    print(f"Status preference (197...): {res.status_code}")
    print(json.dumps(res.json(), indent=2))
except Exception as e:
    print(e)
    
print("\n=== Consultando Subscription ID ===")
try:
    res = requests.get(
        "https://api.mercadopago.com/preapproval/0bc84c22-0ff8-42b5-b23a-d5885f54a437",
        headers=headers
    )
    print(f"Status preapproval 2 (0bc...): {res.status_code}")
    print(json.dumps(res.json(), indent=2))
except Exception as e:
    print(e)
