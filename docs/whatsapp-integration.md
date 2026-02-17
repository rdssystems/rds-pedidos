
# 📱 Integração WhatsApp com Evolution API

A Evolution API é a solução ideal para automatizar seu WhatsApp. Ela cria uma instância do WhatsApp Web em um container e permite enviar mensagens via HTTP.

## 1. Instalação (Docker)

Adicione o seguinte serviço ao seu `docker-compose.yml` (na raiz do projeto):

```yaml
  evolution-api:
    image: attri/evolution-api:v2.1.2
    container_name: evolution_api
    restart: always
    ports:
      - "8081:8080"
    environment:
      - SERVER_PORT=8080
      - AUTHENTICATION_API_KEY=sua-chave-secreta-aqui
      - DEL_INSTANCE=false
    volumes:
      - ./evolution_store:/evolution/store
```

**Nota:** A Evolution API precisa de persistência, então o volume `./evolution_store` é importante para não perder a conexão scans.

Depois, rode:
```bash
docker-compose up -d
```

## 2. Conectando sua Loja (Gerar QR Code)

Acesse o painel da API (Swagger) em `http://localhost:8081/docs` ou use um cliente HTTP (Postman/Insomnia) para criar a instância.

### Passo 1: Criar Instância
**POST** `http://localhost:8081/instance/create`
**Headers:** `apikey: sua-chave-secreta-aqui`
**Body:**
```json
{
  "instanceName": "MinhaLoja",
  "token": "token-da-instancia",
  "qrcode": true
}
```

### Passo 2: Ler o QR Code
A resposta do passo anterior trará um QR Code (base64 ou link). Leia-o com o WhatsApp do estabelecimento (celular).

## 3. Enviando Mensagens Automáticas

Agora você pode integrar no seu Backend Django.

Quando o status do pedido mudar, seu backend fará uma requisição para a Evolution API.

### Exemplo de Código (Python/Django)
No arquivo `backend/core/signals.py` ou `views.py`:

```python
import requests

def enviar_mensagem_whatsapp(numero, mensagem):
    url = "http://evolution-api:8080/message/sendText/MinhaLoja"
    headers = {
        "apikey": "sua-chave-secreta-aqui",
        "Content-Type": "application/json"
    }
    payload = {
        "number": numero, # Ex: 5511999999999
        "options": {
            "delay": 1200,
            "presence": "composing",
            "linkPreview": false
        },
        "textMessage": {
            "text": mensagem
        }
    }
    
    try:
        requests.post(url, json=payload, headers=headers)
    except Exception as e:
        print(f"Erro ao enviar WhatsApp: {e}")

# Uso no ViewSet ou Signal quando status mudar
if pedido.status == 'PREPARO':
    msg = f"Olá {pedido.cliente_nome}! Seu pedido #{pedido.id} começou a ser preparado! 👨‍🍳"
    enviar_mensagem_whatsapp(pedido.cliente_whatsapp, msg)

elif pedido.status == 'DESPACHADO':
    msg = f"Seu pedido #{pedido.id} saiu para entrega! 🛵 Em breve chega aí."
    enviar_mensagem_whatsapp(pedido.cliente_whatsapp, msg)
```

## 4. Webhooks (Opcional)
Você também pode configurar Webhooks na Evolution API para receber mensagens dos clientes e salvar no seu sistema, criando um chat bidirecional.
