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
        response = requests.post(url, headers=self.headers, json=payload)
        return response.json()

    def get_qr_code(self, instance_name):
        url = f"{self.base_url}/instance/connect/{instance_name}"
        response = requests.get(url, headers=self.headers)
        return response.json()

    def get_status(self, instance_name):
        url = f"{self.base_url}/instance/connectionState/{instance_name}"
        response = requests.get(url, headers=self.headers)
        return response.json()

    def logout_instance(self, instance_name):
        url = f"{self.base_url}/instance/logout/{instance_name}"
        response = requests.delete(url, headers=self.headers)
        return response.json()

    def delete_instance(self, instance_name):
        url = f"{self.base_url}/instance/delete/{instance_name}"
        response = requests.delete(url, headers=self.headers)
        return response.json()

    def send_message(self, instance_name, number, text):
        url = f"{self.base_url}/message/sendText/{instance_name}"
        payload = {
            "number": number,
            "text": text,
            "delay": 1200,
            "linkPreview": False
        }
        response = requests.post(url, headers=self.headers, json=payload)
        return response.json()
