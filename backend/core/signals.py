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
from django.db.models.signals import post_save, pre_save
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
        is_trial = instance.loja.status_assinatura == 'trial'
        
        if not recursos.get('whatsapp') and not recursos.get('whatsapp_automation') and not is_trial:
            logger.info(f"WhatsApp automation disabled for plan {instance.loja.plano.nome if instance.loja.plano else 'None'} (Status: {instance.loja.status_assinatura})")
            return

        msg = None
        
        # Context for placeholders
        context = {
            'cliente': instance.cliente_nome,
            'numero': order_num,
            'loja': instance.loja.nome
        }
        
        if instance.status == 'NOVO' and instance.loja.notificar_recebido:
            msg = instance.loja.msg_recebido.format(**context)
        elif instance.status == 'PREPARO' and instance.loja.notificar_preparo:
            msg = instance.loja.msg_preparo.format(**context)
        elif instance.status == 'PRONTO' and instance.loja.notificar_pronto:
            msg = instance.loja.msg_pronto.format(**context)
        elif instance.status == 'DESPACHADO' and instance.loja.notificar_entrega:
            msg = instance.loja.msg_entrega.format(**context)
        elif instance.status == 'FINALIZADO' and instance.loja.notificar_finalizado:
             msg = instance.loja.msg_finalizado.format(**context)
        elif instance.status == 'CANCELADO' and instance.loja.notificar_cancelado:
             msg = instance.loja.msg_cancelado.format(**context)

        if msg:
            try:
                logger.info(f"Iniciando envio de mensagem via Evolution para {instance.cliente_whatsapp}...")
                # Chamada corrigida: (number, message, instance_name)
                EvolutionService().send_message(
                    instance.cliente_whatsapp,
                    msg,
                    instance.loja.evolution_instance
                )
                logger.info("Chamada para send_whatsapp_message concluída.")
            except Exception as e:
                logger.error(f"Erro ao chamar send_whatsapp_message: {e}")

@receiver(pre_save, sender=Pedido)
def calculate_troco(sender, instance, **kwargs):
    """Calcula o troco automaticamente se o valor pago for maior que o total"""
    # Garantir que não sejam None para evitar erros de cálculo
    if instance.valor_pago is None:
        instance.valor_pago = 0.00
    if instance.troco is None:
        instance.troco = 0.00

    if instance.forma_pagamento == 'DINHEIRO' and instance.valor_pago > 0:
        if instance.valor_pago >= instance.total:
            instance.troco = instance.valor_pago - instance.total
        else:
            instance.troco = 0.00

@receiver(post_save, sender=Pedido)
def handle_cashier_movement(sender, instance, created, **kwargs):
    """Registra a venda no caixa quando o pedido é finalizado em dinheiro"""
    from .models import Caixa, MovimentacaoCaixa
    
    if not created and instance.status == 'FINALIZADO' and instance.forma_pagamento == 'DINHEIRO':
        # Busca o caixa aberto da loja
        caixa_aberto = Caixa.objects.filter(loja=instance.loja, status='ABERTO').last()
        
        if caixa_aberto:
            # Evita duplicidade (caso o sinal rode duas vezes)
            if not MovimentacaoCaixa.objects.filter(pedido=instance).exists():
                descricao = f"Venda Pedido #{instance.numero_diario or instance.id}"
                if instance.valor_pago > instance.total:
                    descricao += f" (Pago: {instance.valor_pago}, Troco: {instance.troco})"
                
                MovimentacaoCaixa.objects.create(
                    caixa=caixa_aberto,
                    tipo='VENDA',
                    valor=instance.total,
                    descricao=descricao,
                    pedido=instance
                )
                logger.info(f"Movimentação de caixa registrada para o pedido {instance.id}")

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

from .models import Caixa

@receiver(post_save, sender=Caixa)
def notify_caixa_change(sender, instance, created, **kwargs):
    channel_layer = get_channel_layer()
    
    # Message to send to the group
    message = {
        'id': instance.id,
        'status': instance.status,
        'type': 'CAIXA_UPDATE'
    }
    
    # Send to specific store group
    group_name = f"store_{instance.loja.id}"
    
    async_to_sync(channel_layer.group_send)(
        group_name,
        {
            "type": "caixa_notification",
            "message": message
        }
    )
