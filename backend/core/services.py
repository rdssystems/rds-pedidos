import requests
import json
from django.conf import settings
import os
import logging

logger = logging.getLogger(__name__)

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

    def send_message(self, number, message, instance_name, options=None):
        if not options:
            options = {}
        
        # Sanitize number: remove non-digits and ensure country code
        clean_number = "".join(filter(str.isdigit, str(number)))
        if len(clean_number) <= 11 and not clean_number.startswith('55'):
            clean_number = f"55{clean_number}"
            
        endpoint = f"{self.base_url}/message/sendText/{instance_name}"
        
        # Using both 'text' and 'textMessage' for maximum compatibility
        payload = {
            "number": clean_number,
            "text": message,
            "textMessage": {
                "text": message
            },
            "options": {
                "delay": options.get('delay', 1200),
                "presence": options.get('presence', "composing"),
                "linkPreview": options.get('linkPreview', False)
            }
        }
        
        try:
            logger.info(f"Enviando mensagem WhatsApp para {clean_number} na instância {instance_name}")
            response = requests.post(endpoint, json=payload, headers=self.headers, timeout=10)
            
            if response.status_code >= 400:
                logger.error(f"Erro Evolution API ({response.status_code}): {response.text}")
                return {"status": "error", "error": response.text}
                
            return response.json()
        except Exception as e:
            logger.error(f"Falha ao conectar com Evolution API: {e}")
            return {"status": "error", "error": str(e)}
