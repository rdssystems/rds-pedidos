import requests
import json
from django.conf import settings
import os

class EvolutionService:
    def __init__(self):
        self.base_url = os.getenv('EVOLUTION_API_URL', 'http://evolution-api:8080')
        self.api_key = os.getenv('EVOLUTION_API_KEY')
        self.headers = {
            'Content-Type': 'application/json',
            'apikey': self.api_key
        }

    def create_instance(self, instance_name):
        url = f"{self.base_url}/instance/create"
        payload = {
            "instanceName": instance_name,
            "token": "", # Let it generate a token
            "qrcode": True,
            "integration": "WHATSAPP-BAILEYS"
        }
        try:
            response = requests.post(url, headers=self.headers, json=payload, timeout=10)
            return response.json()
        except Exception as e:
            return {"error": str(e)}

    def get_qr_code(self, instance_name):
        url = f"{self.base_url}/instance/connect/{instance_name}"
        try:
            response = requests.get(url, headers=self.headers, timeout=15)
            if response.status_code != 200:
                return {"error": f"Status {response.status_code}", "detail": response.text}
            return response.json()
        except Exception as e:
            return {"error": str(e)}

    def get_status(self, instance_name):
        url = f"{self.base_url}/instance/connectionState/{instance_name}"
        try:
            response = requests.get(url, headers=self.headers, timeout=10)
            return response.json()
        except Exception as e:
            return {"error": str(e)}

    def logout_instance(self, instance_name):
        url = f"{self.base_url}/instance/logout/{instance_name}"
        try:
            response = requests.delete(url, headers=self.headers, timeout=10)
            return response.json()
        except Exception as e:
            return {"error": str(e)}

    def delete_instance(self, instance_name):
        url = f"{self.base_url}/instance/delete/{instance_name}"
        try:
            response = requests.delete(url, headers=self.headers, timeout=10)
            return response.json()
        except Exception as e:
            return {"error": str(e)}

    def set_webhook(self, instance_name):
        url = f"{self.base_url}/webhook/set/{instance_name}"
        # A URL que a Evolution vai bater. "backend" porque estão na mesma rede do docker.
        webhook_url = f"http://backend:8000/api/evolution/webhook/{instance_name}/"
        payload = {
            "webhook": {
                "enabled": True,
                "url": webhook_url,
                "webhookByEvents": False,
                "events": [
                    "MESSAGES_UPSERT"
                ]
            }
        }
        try:
            response = requests.post(url, headers=self.headers, json=payload, timeout=10)
            return response.json()
        except Exception as e:
            return {"error": str(e)}

    def send_message(self, instance_name, number, text):
        url = f"{self.base_url}/message/sendText/{instance_name}"
        payload = {
            "number": number,
            "text": text,
            "delay": 1200,
            "linkPreview": False
        }
        try:
            response = requests.post(url, headers=self.headers, json=payload, timeout=10)
            return response.json()
        except Exception as e:
            return {"error": str(e)}
