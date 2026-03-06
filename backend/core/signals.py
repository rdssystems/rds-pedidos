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
        'cliente_whatsapp': instance.cliente_whatsapp,
        'total': str(instance.total),
        'tipo': instance.tipo,
        'endereco': instance.endereco,
        'forma_pagamento': instance.forma_pagamento,
        'observacoes': instance.observacoes,
        'criado_em': instance.criado_em.isoformat() if instance.criado_em else None,
        'is_new': created
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
        # Check if the plan allows WhatsApp automation
        recursos = instance.loja.plano.recursos if instance.loja.plano else {}
        if not recursos.get('whatsapp_automation'):
            logger.info(f"WhatsApp automation disabled for plan {instance.loja.plano.nome if instance.loja.plano else 'None'}")
            return

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

from django.contrib.auth.models import User
from .models import Produto, ConfiguracaoLoja, Plano, UserProfile
from django.utils import timezone
from datetime import timedelta

@receiver(post_save, sender=User)
def create_user_profile(sender, instance, created, **kwargs):
    if created:
        UserProfile.objects.get_or_create(user=instance)

@receiver(post_save, sender=ConfiguracaoLoja)
def setup_new_store_trial(sender, instance, created, **kwargs):
    if created:
        try:
            # All new stores start with 3 days of PRO Trial (replaces Elite)
            pro_plan = Plano.objects.filter(nome='PRO').first()
            if pro_plan:
                instance.plano = pro_plan
                instance.status_assinatura = 'trial'
                instance.valido_ate = timezone.now() + timedelta(days=3)
                instance.save()
                logger.info(f"Trial de 3 dias (PRO) configurado para a loja: {instance.nome}")
        except Exception as e:
            logger.error(f"Erro ao configurar trial para nova loja: {e}")

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
