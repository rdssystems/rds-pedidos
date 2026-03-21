import os
import requests
from django.conf import settings
from core.models import ConfiguracaoLoja
from core.ai_service import GeminiService

class EvolutionWebhookService:
    @staticmethod
    def processar_webhook(codigo_instancia, payload):
        """
        Processa o webhook recebido da Evolution API.
        """
        try:
            event = payload.get('event')
            
            # Só queremos processar novas mensagens recebidas
            if event != 'messages.upsert':
                return False
                
            data = payload.get('data', {})
            message = data.get('message', {})
            key = data.get('key', {})
            
            # Não processar mensagens enviadas por nós mesmos
            if key.get('fromMe', False):
                return False
                
            # Identificar o tipo da mensagem (texto)
            conversation = message.get('conversation')
            extended_text = message.get('extendedTextMessage', {}).get('text')
            
            texto_cliente = conversation or extended_text
            if not texto_cliente:
                return False # Ignora áudio, imagens, etc por enquanto
                
            telefone_cliente = key.get('remoteJid', '').split('@')[0]
            if not telefone_cliente:
                return False
                
            # Localizar a Loja dona dessa instância
            loja = ConfiguracaoLoja.objects.filter(evolution_instance=codigo_instancia, ativa=True).first()
            if not loja:
                return False
                
            # Verificar se a loja tem o bot ativo e se está no plano Pro
            if not loja.bot_ativo_whatsapp or loja.plano_tipo != 'PRO':
                return False
                
            # TODO: Lógica de "Transbordo"/Handoff (Pause state)
            # Idealmente teríamos uma tabela para saber se o cliente X está "Pausado" para falar com humano.
            
            print(f"[{loja.nome}] Recebida mensagem do WhatsApp de {telefone_cliente}: {texto_cliente}")
            
            # Passar para o Gemini gerar a resposta
            ai_service = GeminiService()
            resposta_ia = ai_service.processar_mensagem_whatsapp(loja, telefone_cliente, texto_cliente)
            
            if resposta_ia:
                # Enviar resposta de volta usando a Evolution API
                EvolutionWebhookService.enviar_mensagem(loja.evolution_instance, telefone_cliente, resposta_ia)
                return True
                
            return False
        except Exception as e:
            print(f"Erro em processar_webhook: {e}")
            return False

    @staticmethod
    def enviar_mensagem(instancia, numero, texto):
        """
        Gera uma chamada POST para a Evolution API enviando texto.
        """
        base_url = os.getenv('EVOLUTION_API_URL', 'http://evolution-api:8080')
        api_key = os.getenv('EVOLUTION_API_KEY', 'B8D9F0A1C2E345678901234567890ABC')
        
        endpoint = f"{base_url}/message/sendText/{instancia}"
        
        headers = {
            "Content-Type": "application/json",
            "apikey": api_key
        }
        
        payload = {
            "number": numero,
            "options": {
                "delay": 1200,
                "presence": "composing"
            },
            "textMessage": {
                "text": texto
            }
        }
        
        try:
            response = requests.post(endpoint, json=payload, headers=headers)
            response.raise_for_status()
            print(f"Mensagem enviada via Evolution para {numero}.")
            return True
        except Exception as e:
            print(f"Erro ao enviar mensagem via Evolution: {e}")
            return False
