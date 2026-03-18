import logging
from datetime import datetime, timedelta
from django.utils import timezone
from django.db.models import Sum

logger = logging.getLogger(__name__)

def check_store_closing_routines():
    """
    Job that runs periodically to:
    1. Close open tables after the store closes.
    2. Auto-close cashiers 2 hours before the store opens.
    """
    from core.models import ConfiguracaoLoja, Pedido, Caixa, MovimentacaoCaixa, NotificacaoSistema
    
    # Run every 15 mins for example.
    logger.info("Running store closing routines...")
    
    agora_br = timezone.now() - timedelta(hours=3)
    
    lojas = ConfiguracaoLoja.objects.filter(ativa=True)
    for loja in lojas:
        horario = loja.horario_funcionamento or {}
        
        # Determine today's config
        today_weekday = agora_br.strftime('%a').lower()[:3]
        weekday_map = {
            'mon': 'seg', 'tue': 'ter', 'wed': 'qua', 'thu': 'qui', 
            'fri': 'sex', 'sat': 'sab', 'sun': 'dom'
        }
        today_key = weekday_map.get(today_weekday, 'seg')
        
        # Determine tomorrow's config
        tomorrow_br = agora_br + timedelta(days=1)
        tomorrow_weekday = tomorrow_br.strftime('%a').lower()[:3]
        tomorrow_key = weekday_map.get(tomorrow_weekday, 'seg')
        
        hoje_config = horario.get(today_key, {})
        amanha_config = horario.get(tomorrow_key, {})
        
        # se está fechado hoje, ignora rotina ou ajusta
        if not hoje_config or hoje_config.get('closed', True):
            continue
            
        open_str = hoje_config.get('open', '00:00')
        close_str = hoje_config.get('close', '23:59')
        
        try:
            oh, om = map(int, open_str.split(':'))
            ch, cm = map(int, close_str.split(':'))
        except:
             continue
             
        # datetime of today's closing
        close_time = agora_br.replace(hour=ch, minute=cm, second=0, microsecond=0)
        open_time = agora_br.replace(hour=oh, minute=om, second=0, microsecond=0)
        
        if ch < oh:
            # Closes on the next day (e.g., opens 18:00, closes 02:00)
            close_time += timedelta(days=1)
            
        # 1. MESA CLEANUP: If we passed the closing time
        if agora_br >= close_time and agora_br < close_time + timedelta(hours=4): # limit processing to a 4h window after closing
            mesas_abertas = Pedido.objects.filter(
                loja=loja,
                tipo='MESA',
                status__in=['NOVO', 'PREPARO', 'PRONTO', 'DESPACHADO']
            )
            count = mesas_abertas.count()
            if count > 0:
                mesas_abertas.update(status='CANCELADO', observacoes="Mesa cancelada automaticamente pelo sistema após o horário de fechamento.")
                
                NotificacaoSistema.objects.create(
                    loja=loja,
                    titulo="Mesas Encerradas Automaticamente",
                    mensagem=f"{count} mesa(s) que ficaram esquecidas foram canceladas automaticamente após o encerramento do expediente."
                )
                logger.info(f"[{loja.nome}] {count} mesas abertas foram canceladas automaticamente.")

        # 2. AUTO-CLOSE CAIXA: 2 hours before NEXT opening time
        # Get next opening time
        if agora_br < open_time:
            # We are in the morning before opening today
            next_open = open_time
        else:
            # We are after opening today, next open is tomorrow
            next_oh, next_om = 0, 0
            if not amanha_config.get('closed', False):
                next_open_str = amanha_config.get('open', '00:00')
                try:
                    next_oh, next_om = map(int, next_open_str.split(':'))
                except:
                    pass
            next_open = tomorrow_br.replace(hour=next_oh, minute=next_om, second=0, microsecond=0)
            
        caixas_abertos = Caixa.objects.filter(loja=loja, status='ABERTO')
        
        # Are we within 2 hours of the next opening, OR has it been way past closing?
        # A simpler robust rule: if we are <= 2 hours before the next open time, and current time > close time.
        dois_horas_antes = next_open - timedelta(hours=2)
        
        # If current time has passed 'dois_horas_antes' (but we haven't opened yet)
        if agora_br >= dois_horas_antes and agora_br < next_open:
            for caixa in caixas_abertos:
                # Calculate expected total
                mov_vendas = MovimentacaoCaixa.objects.filter(caixa=caixa, tipo='VENDA').aggregate(Sum('valor'))['valor__sum'] or 0
                mov_suprimentos = MovimentacaoCaixa.objects.filter(caixa=caixa, tipo='SUPRIMENTO').aggregate(Sum('valor'))['valor__sum'] or 0
                mov_sangrias = MovimentacaoCaixa.objects.filter(caixa=caixa, tipo='SANGRIA').aggregate(Sum('valor'))['valor__sum'] or 0
                
                saldo_esperado = caixa.saldo_inicial + mov_vendas + mov_suprimentos - mov_sangrias
                
                caixa.status = 'FECHADO'
                caixa.data_fechamento = timezone.now()
                caixa.saldo_final_esperado = saldo_esperado
                caixa.saldo_final_informado = saldo_esperado # assumed
                caixa.save()
                
                MovimentacaoCaixa.objects.create(
                    caixa=caixa,
                    tipo='FECHAMENTO',
                    valor=saldo_esperado,
                    descricao="Fechamento Automático do Sistema"
                )
                
                NotificacaoSistema.objects.create(
                    loja=loja,
                    titulo="Caixa Fechado Automaticamente",
                    mensagem=f"O caixa do operador {caixa.operador.username} foi fechado automaticamente. Saldo esperado: R$ {saldo_esperado:.2f}."
                )
                logger.info(f"[{loja.nome}] Caixa {caixa.id} fechado automaticamente.")
