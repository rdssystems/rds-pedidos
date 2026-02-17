from django.db.models.signals import post_save
from django.dispatch import receiver
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from django.conf import settings
from .models import Pedido
import json
import requests
import logging
import os
from .services import EvolutionService


logger = logging.getLogger(__name__)

# The global function is kept for backward compatibility if needed, 
# but we prefer using EvolutionService within the signal
def send_whatsapp_message(number, text, instance_name=None):
    service = EvolutionService()
    if not instance_name:
        instance_name = os.getenv('EVOLUTION_INSTANCE_NAME', 'loja')
    
    # Format number
    clean_number = ''.join(filter(str.isdigit, number))
    if len(clean_number) in [10, 11]:
        clean_number = '55' + clean_number
        
    try:
        service.send_message(instance_name, clean_number, text)
    except Exception as e:
        logger.error(f"Error sending WhatsApp message: {e}")

@receiver(post_save, sender=Pedido)
def notify_order_change(sender, instance, created, **kwargs):
    channel_layer = get_channel_layer()
    
    # Message to send to the group
    order_num = instance.numero_diario or instance.id
    message = {
        'id': instance.id,
        'numero_diario': instance.numero_diario,
        'status': instance.status,
        'cliente_nome': instance.cliente_nome,
        'total': str(instance.total),
        'created': created
    }
    
    # Send to specific store group
    group_name = f"store_{instance.loja.id}"
    
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "order_notification",
            "message": message
        }
    )
    
    # Send WhatsApp Notification on Status Change
    if not created and instance.cliente_whatsapp and instance.loja.evolution_instance:
        msg = None
        
        # Context for placeholders
        context = {
            'cliente': instance.cliente_nome,
            'numero': order_num,
            'loja': instance.loja.nome
        }
        
        if instance.status == 'PREPARO' and instance.loja.notificar_preparo:
            msg = instance.loja.msg_preparo.format(**context)
        # Status 'PRONTO' - No notification as requested (waiting for delivery)
        elif instance.status == 'DESPACHADO' and instance.loja.notificar_entrega:
            msg = instance.loja.msg_entrega.format(**context)
        elif instance.status == 'FINALIZADO' and instance.loja.notificar_finalizado:
             msg = instance.loja.msg_finalizado.format(**context)

        if msg:
            send_whatsapp_message(instance.cliente_whatsapp, msg, instance.loja.evolution_instance)

from .models import Produto

@receiver(post_save, sender=Produto)
def notify_stock_change(sender, instance, created, **kwargs):
    if not instance.controlar_estoque:
        return

    channel_layer = get_channel_layer()
    
    message = {
        'id': instance.id,
        'nome': instance.nome,
        'estoque_atual': instance.estoque_atual,
        'disponivel': instance.disponivel
    }
    
    # Product -> Category -> Store
    try:
        store_id = instance.categoria.loja.id
        group_name = f"store_{store_id}"
        
        async_to_sync(channel_layer.group_send)(
            group_name,
            {
                "type": "stock_notification",
                "message": message
            }
        )
    except Exception as e:
        logger.error(f"Error sending stock update: {e}")
