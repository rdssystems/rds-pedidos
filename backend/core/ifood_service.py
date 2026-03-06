import requests
import datetime
from django.utils import timezone
from django.conf import settings
from .models import ConfiguracaoLoja, Pedido, ItemPedido, Produto, Categoria

class IFoodService:
    BASE_URL = "https://merchant-api.ifood.com.br"

    def __init__(self, loja: ConfiguracaoLoja):
        self.loja = loja

    def get_token(self):
        """Obtém ou renova o access token do iFood"""
        if self.loja.ifood_token and self.loja.ifood_token_expires and self.loja.ifood_token_expires > timezone.now():
            return self.loja.ifood_token

        url = f"{self.BASE_URL}/authentication/v1.0/oauth/token"
        data = {
            "grantType": "client_credentials",
            "clientId": settings.IFOOD_CLIENT_ID,
            "clientSecret": settings.IFOOD_CLIENT_SECRET,
        }

        try:
            response = requests.post(url, data=data)
            response.raise_for_status()
            res_data = response.json()
            
            self.loja.ifood_token = res_data['accessToken']
            # O token expira em res_data['expiresIn'] segundos
            self.loja.ifood_token_expires = timezone.now() + datetime.timedelta(seconds=res_data['expiresIn'] - 60)
            self.loja.save()
            
            return self.loja.ifood_token
        except Exception as e:
            print(f"Erro ao obter token do iFood para loja {self.loja.id}: {e}")
            return None

    def get_events(self):
        """Consulta eventos (pedidos novos, cancelados, etc)"""
        token = self.get_token()
        if not token:
            return []

        url = f"{self.BASE_URL}/order/v1.0/events:polling"
        headers = {"Authorization": f"Bearer {token}"}

        try:
            response = requests.get(url, headers=headers)
            if response.status_code == 204: # No content
                return []
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Erro ao buscar eventos do iFood: {e}")
            return []

    def acknowledge_events(self, event_ids):
        """Avisa o iFood que os eventos foram recebidos"""
        token = self.get_token()
        if not token:
            return

        url = f"{self.BASE_URL}/order/v1.0/events/acknowledgment"
        headers = {"Authorization": f"Bearer {token}"}
        
        try:
            requests.post(url, json=event_ids, headers=headers)
        except Exception as e:
            print(f"Erro ao confirmar eventos no iFood: {e}")

    def get_order_details(self, order_id):
        """Busca detalhes de um pedido específico"""
        token = self.get_token()
        if not token:
            return None

        url = f"{self.BASE_URL}/order/v1.0/orders/{order_id}"
        headers = {"Authorization": f"Bearer {token}"}

        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Erro ao buscar detalhes do pedido {order_id}: {e}")
            return None

    def update_order_status(self, ifood_order_id, status):
        """Atualiza o status do pedido no iFood (CONFIRM, READY_TO_PICKUP, DISPATCH, etc)"""
        token = self.get_token()
        if not token:
            return False

        # Mapeamento simples
        status_map = {
            'PREPARO': 'confirm',
            'PRONTO': 'readyToPickup',
            'DESPACHADO': 'dispatch',
        }

        action = status_map.get(status)
        if not action:
            return False

        url = f"{self.BASE_URL}/order/v1.0/orders/{ifood_order_id}/{action}"
        headers = {"Authorization": f"Bearer {token}"}

        try:
            response = requests.post(url, headers=headers)
            return response.status_code in [200, 202, 204]
        except Exception as e:
            print(f"Erro ao atualizar status no iFood: {e}")
            return False

    def get_catalogs(self):
        """Lista os catálogos disponíveis para a loja"""
        token = self.get_token()
        if not token: return []
        
        url = f"{self.BASE_URL}/catalog/v1.0/merchants/{self.loja.ifood_merchant_id}/catalogs"
        headers = {"Authorization": f"Bearer {token}"}
        
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            return response.json()
        except Exception as e:
            print(f"Erro ao buscar catálogos iFood: {e}")
            return []

    def import_catalog(self):
        """Importa categorias e produtos do iFood para o sistema local"""
        token = self.get_token()
        if not token: return {"error": "Não foi possível obter o token do iFood"}
        
        catalogs = self.get_catalogs()
        if not catalogs:
            return {"error": "Nenhum catálogo encontrado no iFood para esta loja"}
            
        catalog_id = catalogs[0]['catalogId']
        url = f"{self.BASE_URL}/catalog/v1.0/merchants/{self.loja.ifood_merchant_id}/catalogs/{catalog_id}/categories"
        headers = {"Authorization": f"Bearer {token}"}
        
        stats = {"categories": 0, "products": 0}
        
        try:
            response = requests.get(url, headers=headers)
            response.raise_for_status()
            categories_data = response.json()
            
            for cat_data in categories_data:
                # Criar ou obter categoria
                category, created = Categoria.objects.get_or_create(
                    loja=self.loja,
                    nome=cat_data['name'],
                    defaults={'ordem': stats['categories']}
                )
                if created: stats['categories'] += 1
                
                # Importar produtos da categoria
                # A API do iFood pode vir com itens dentro da categoria ou exigir outra chamada
                # Dependendo da versão, os campos podem variar.
                # Geralmente no iFood v1, você tem um campo 'items' ou precisa buscar p/ categoria.
                # Vamos assumir que os itens simples vêm na resposta ou tentar buscar se vazio.
                items = cat_data.get('items', [])
                for item in items:
                    # Tentar encontrar produto pelo nome na mesma categoria para evitar duplicidade
                    produto, p_created = Produto.objects.update_or_create(
                        categoria=category,
                        nome=item['name'],
                        defaults={
                            'descricao': item.get('description', ''),
                            'preco': item.get('price', {}).get('value', 0.0),
                            'disponivel': item.get('status', 'AVAILABLE') == 'AVAILABLE'
                        }
                    )
                    if p_created: stats['products'] += 1
                    
            return stats
        except Exception as e:
            print(f"Erro na importação de cardápio iFood: {e}")
            return {"error": str(e)}
