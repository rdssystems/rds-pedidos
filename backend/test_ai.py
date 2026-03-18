import os
import django
import sys
from decimal import Decimal

# Setup Django environment
sys.path.append('c:/Users/Klisman rDs/Documents/Gerenciador de Pedidos/backend')
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from core.ai_service import GeminiService
from core.models import ConfiguracaoLoja

def test_chat():
    # Load .env manually if needed, but core.settings usually handles it or we can do it here
    from dotenv import load_dotenv
    load_dotenv('c:/Users/Klisman rDs/Documents/Gerenciador de Pedidos/.env')
    
    service = GeminiService()
    if not os.getenv('GOOGLE_API_KEY') or os.getenv('GOOGLE_API_KEY') == 'sua-chave-aqui':
        print("AVISO: GOOGLE_API_KEY não configurada ou usando placeholder. O teste falhará na chamada real à API.")
    
    loja = ConfiguracaoLoja.objects.first()
    if not loja:
        print("Nenhuma loja encontrada para teste.")
        return
    
    print(f"Testando Especialista em Finanças para a loja: {loja.nome}")
    print("Enviando query: 'Como está meu faturamento?'")
    
    # We don't want to actually call the API if the key is a placeholder to avoid error logs
    if os.getenv('GOOGLE_API_KEY') == 'sua-chave-aqui':
        print("\n[MOCK] Resposta da IA: Olá! Como sua chave de API ainda é o placeholder, não consigo analisar os dados reais, mas estou pronto para agir assim que você inserir sua chave do Google AI Studio!")
    else:
        response = service.chat_specialist(loja, "Como está meu faturamento?")
        print("\nResposta da IA:")
        print(response)

if __name__ == "__main__":
    test_chat()
