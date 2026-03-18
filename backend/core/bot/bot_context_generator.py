import json
from decimal import Decimal
from core.models import ConfiguracaoLoja

class BotContextGenerator:
    @staticmethod
    def gerar_contexto(loja: ConfiguracaoLoja) -> str:
        """
        Gera o contexto completo da loja (Cardápio, Horários, Taxas, Regras)
        para alimentar o prompt do Google Gemini.
        """
        contexto = []
        
        # 1. Identidade e Regras Básicas
        contexto.append(f"Você é o atendente de Inteligência Artificial da loja '{loja.nome}'.")
        if loja.bot_personalidade:
            contexto.append(f"SUA PERSONALIDADE/TOM DE VOZ: {loja.bot_personalidade}")
        
        contexto.append("REGRAS ESTRITAS (GUARDRAILS):")
        contexto.append("- Você NÃO deve inventar preços, produtos ou bairros que não estejam listados abaixo.")
        contexto.append("- Se o cliente pedir algo que não está no cardápio ou perguntar de uma região não listada, diga educadamente que não possuímos/atendemos no momento.")
        contexto.append("- Seja claro e conciso. Tente concluir o atendimento guiando o cliente para fazer o pedido no link do catálogo se achar adequado.")
        contexto.append(f"- Link do nosso catálogo: {loja.slug}.rdspedidos.com.br") # Ajuste depois para app.rdspedidos.com.br/loja_slug
        
        # 2. Conhecimento Extra
        if loja.bot_conhecimento:
            contexto.append(f"\nCONHECIMENTOS EXTRAS DO ESTABELECIMENTO:\n{loja.bot_conhecimento}")
            
        # 3. Entrega e Taxas
        contexto.append("\nINFORMAÇÕES DE ENTREGA:")
        if loja.tipo_taxa_entrega == 'FIXA':
            contexto.append(f"- Trabalhamos com taxa de entrega FIXA no valor de R$ {loja.taxa_entrega_fixa}.")
        else:
            contexto.append("- Nossa taxa de entrega é calculada POR BAIRRO.")
            bairros = loja.bairros_entrega.filter(ativo=True)
            if bairros.exists():
                lista_bairros = [f"{b.nome} - R$ {b.taxa}" for b in bairros]
                contexto.append(f"  Bairros atendidos: {', '.join(lista_bairros)}")
            else:
                contexto.append("  (Aviso ao bot: Ainda não há bairros configurados. Diga que aceitamos apenas retirada no local ou peça para o cliente aguardar contato humano).")

        # 4. Horários de Funcionamento (Sem cálculo de "aberto agora" para simplificar, a IA interpreta bem)
        contexto.append("\nHORÁRIOS DE FUNCIONAMENTO (Formato JSON):")
        contexto.append(json.dumps(loja.horario_funcionamento, ensure_ascii=False))

        # 5. Cardápio (Apenas Produtos Ativos)
        contexto.append("\nCARDÁPIO (Baseie-se APENAS nestes itens):")
        categorias = loja.categorias.filter(ativa=True)
        if not categorias.exists():
            contexto.append("- O cardápio ainda está sendo configurado e não possui itens ativos.")
        else:
            for categoria in categorias:
                contexto.append(f"Categoria: {categoria.nome}")
                produtos = categoria.produtos.filter(disponivel=True)
                for prod in produtos:
                    desc_str = f" - {prod.descricao}" if prod.descricao else ""
                    contexto.append(f" * {prod.nome} - R$ {prod.preco}{desc_str}")

        return "\n".join(contexto)
