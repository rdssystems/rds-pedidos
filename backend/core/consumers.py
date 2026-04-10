import json
from channels.generic.websocket import AsyncWebsocketConsumer

class OrderConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.store_id = self.scope['url_route']['kwargs'].get('store_id')
        
        if self.store_id:
            self.group_name = f"store_{self.store_id}"
        else:
            self.group_name = "administracao" # Fallback/Legacy
        
        # Join group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        
        await self.accept()

    async def disconnect(self, close_code):
        # Leave group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    # Receive message from room group
    async def order_notification(self, event):
        message = event['message']

        # Send message to WebSocket with UPPERCASE type
        await self.send(text_data=json.dumps({
            'type': 'ORDER_UPDATE',
            'message': message
        }))

    async def stock_notification(self, event):
        message = event['message']

        # Send message to WebSocket with UPPERCASE type
        await self.send(text_data=json.dumps({
            'type': 'STOCK_UPDATE',
            'message': message
        }))

    async def caixa_notification(self, event):
        message = event['message']

        # Send message to WebSocket with UPPERCASE type
        await self.send(text_data=json.dumps({
            'type': 'CAIXA_UPDATE',
            'message': message
        }))
