import google.generativeai as genai
import os
from django.conf import settings
from decimal import Decimal
from django.utils import timezone
from .models import Caixa, Pedido, MovimentacaoCaixa

class GeminiService:
    def __init__(self):
        api_key = os.getenv('GOOGLE_API_KEY')
        if api_key:
            genai.configure(api_key=api_key)
            # Utilizar a versão 2.5 disponível na nova API
            self.model = genai.GenerativeModel('gemini-2.5-flash')
        else:
            self.model = None

    def _format_currency(self, value):
        return f"R$ {value:,.2f}".replace(',', 'X').replace('.', ',').replace('X', '.')

    def get_financial_report(self, caixa_id):
        if not self.model:
            return "Configuração de IA Pendente: Adicione a GOOGLE_API_KEY no seu painel."

        try:
            caixa = Caixa.objects.get(id=caixa_id)
            movimentacoes = caixa.movimentacoes.all()
            
            # Resumo de Entradas
            total_vendas = movimentacoes.filter(tipo='VENDA').count()
            valor_vendas = sum(m.valor for m in movimentacoes.filter(tipo='VENDA'))
            
            # Métodos de Pagamento (precisamos buscar pelos pedidos vinculados às movimentações)
            formas_pagamento = {}
            pedidos_ids = movimentacoes.filter(tipo='VENDA', pedido__isnull=False).values_list('pedido_id', flat=True)
            pedidos = Pedido.objects.filter(id__in=pedidos_ids)
            
            for p in pedidos:
                fp = p.get_forma_pagamento_display()
                formas_pagamento[fp] = formas_pagamento.get(fp, Decimal('0.00')) + p.total

            # Saídas (Sangrias)
            sangrias = movimentacoes.filter(tipo='SANGRIA')
            total_sangrias = sum(m.valor for m in sangrias)

            # Ticket Médio
            ticket_medio = valor_vendas / total_vendas if total_vendas > 0 else 0

            context = f"""
            Você é o 'Especialista em Finanças' do sistema RDS Pedidos. 
            Sua tarefa é gerar um relatório de fechamento de caixa elegante, motivador e inteligente para o dono do restaurante.
            
            Dados do Fechamento:
            - Loja: {caixa.loja.nome}
            - Operador: {caixa.operador.username}
            - Data Abertura: {caixa.data_abertura.strftime('%d/%m/%Y %H:%M')}
            - Data Fechamento: {caixa.data_fechamento.strftime('%d/%m/%Y %H:%M') if caixa.data_fechamento else 'N/A'}
            - Saldo Inicial: {self._format_currency(caixa.saldo_inicial)}
            - Total de Vendas: {total_vendas} pedidos
            - Faturamento Total (Vendas): {self._format_currency(valor_vendas)}
            - Ticket Médio: {self._format_currency(ticket_medio)}
            - Sangrias (Retiradas): {self._format_currency(total_sangrias)}
            - Saldo Final Esperado: {self._format_currency(caixa.saldo_final_esperado or 0)}
            - Saldo Final Informado: {self._format_currency(caixa.saldo_final_informado or 0)}
            
            Divisão por Pagamento:
            {chr(10).join([f"- {k}: {self._format_currency(v)}" for k, v in formas_pagamento.items()])}
            
            Instruções:
            1. Use Emojis para tornar o relatório visual.
            2. Destaque os pontos positivos (ex: ticket médio alto, volume de vendas).
            3. Se houver diferença entre saldo esperado e informado, mencione de forma profissional.
            4. Termine com uma frase de incentivo para o próximo expediente.
            5. O tom deve ser de um consultor financeiro de elite.
            """

            response = self.model.generate_content(context)
            return response.text

        except Exception as e:
            return f"Erro ao gerar relatório: {str(e)}"

    def chat_specialist(self, loja, query, owner_name="Gestor"):
        if not self.model:
            return "IA não configurada."

        try:
            # Pegar últimas vendas para contexto
            vendas_recentes = Pedido.objects.filter(loja=loja).order_by('-criado_em')[:20]
            context_vendas = "\n".join([f"- {v.criado_em.strftime('%d/%m')}: {self._format_currency(v.total)} ({v.get_forma_pagamento_display()})" for v in vendas_recentes])

            prompt = f"""
            Você é o 'Especialista em Finanças' da loja {loja.nome}.
            Você está conversando com o(a) dono(a) do estabelecimento, {owner_name}. 

            Diretrizes:
            1. Seja educado, profissional e chame-o pelo nome.
            2. NUNCA liste pedidos, histórico ou faturamento a menos que ele explicitamente peça.
            3. Se a mensagem for apenas um cumprimento (ex: "Olá", "Oi"), apenas cumprimente de volta e pergunte como pode ajudar, sem citar os dados da loja.
            4. Responda de forma direta e concisa.
            
            Informações recentes de Vendas (NÃO exiba essa lista, use apenas se precisar calcular algo que ele pedir):
            {context_vendas}
            
            Mensagem do Proprietário: {query}
            """
            
            response = self.model.generate_content(prompt)
            return response.text
        except Exception as e:
            return f"Desculpe, tive um problema ao analisar seus dados: {str(e)}"

    def processar_mensagem_whatsapp(self, loja, telefone_cliente, mensagem_cliente):
        """
        Gera uma resposta do Atendente IA usando o contexto da loja.
        """
        if not self.model:
            return None # IA não configurada
        
        from .bot.bot_context_generator import BotContextGenerator
        
        try:
            # 1. Obter o Contexto da Loja (Prompt Base + RAG)
            contexto_base = BotContextGenerator.gerar_contexto(loja)
            
            # 2. Montar o Prompt Final
            prompt_final = f"""
{contexto_base}

---
MENSAGEM DO CLIENTE (Telefone: {telefone_cliente}):
"{mensagem_cliente}"

Responda de forma adequada como o atendente da loja, seguindo as regras e a personalidade definidas acima.
"""
            # 3. Chamar o Gemini
            response = self.model.generate_content(prompt_final)
            return response.text
        except Exception as e:
            print(f"Erro no Gemini Whatsapp Bot: {e}")
            return None
