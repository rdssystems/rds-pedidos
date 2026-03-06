import requests
from django.conf import settings

class MercadoPagoService:
    def __init__(self):
        self.access_token = settings.MERCADO_PAGO_ACCESS_TOKEN
        self.base_url = "https://api.mercadopago.com"
        self.headers = {
            "Authorization": f"Bearer {self.access_token}",
            "Content-Type": "application/json"
        }
        
        # Mercado Pago recusa a palavra 'localhost' em back_urls (status 400 - "Invalid value for back url")
        # Mas ele curiosamente aceita '127.0.0.1'. Portanto, fazemos essa substituição apenas para funcionar em desenvolvimento.
        base_frontend = getattr(settings, 'FRONTEND_URL', 'http://127.0.0.1:3000')
        if "localhost" in base_frontend:
            base_frontend = base_frontend.replace("localhost", "127.0.0.1:3000")
            
        self.frontend_url = base_frontend

    def create_subscription(self, plan_id_unused, payer_email, amount, reason):
        """
        Cria uma assinatura direta (sem plano pré-definido) para gerar o init_point.
        Isso permite que o Mercado Pago colete o cartão no checkout.
        """
        url = f"{self.base_url}/preapproval"
        subscription_data = {
            "payer_email": payer_email,
            "reason": reason,
            "auto_recurring": {
                "frequency": 1,
                "frequency_type": "months",
                "transaction_amount": amount,
                "currency_id": "BRL"
            },
            "back_url": f"{self.frontend_url}/settings/billing?status=success",
            "status": "pending"
        }
        
        print(f"DEBUG: MP POST to {url} (Direct Subscription)")
        response = requests.post(url, headers=self.headers, json=subscription_data)
        print(f"DEBUG: MP Status: {response.status_code}")
        return response.json()

    def create_plan(self, title, amount, frequency=1, frequency_type="months"):
        # Mantido por compatibilidade, mas o fluxo direto é mais simples para redirect
        url = f"{self.base_url}/preapproval_plan"
        plan_data = {
            "reason": title,
            "auto_recurring": {
                "frequency": frequency,
                "frequency_type": frequency_type,
                "transaction_amount": amount,
                "currency_id": "BRL"
            },
            "back_url": f"{self.frontend_url}/settings/billing?status=success"
        }
        response = requests.post(url, headers=self.headers, json=plan_data)
        return response.json()

    def get_subscription_status(self, preapproval_id):
        """
        Verifica o status atual de uma assinatura.
        """
        url = f"{self.base_url}/preapproval/{preapproval_id}"
        response = requests.get(url, headers=self.headers)
        return response.json()
