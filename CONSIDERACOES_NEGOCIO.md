# 🚀 Planejamento Estratégico: Gestão de Pedidos ERP

Este documento consolida as sugestões técnicas e de negócio para transformar o sistema em um ERP competitivo no mercado brasileiro.

---

## 💰 Estratégia de Planos (SaaS)

Baseado nos concorrentes (Anota AI, Goomer, Consumer), a sugestão é ter 3 níveis:

| Plano | Valor Estimado | Foco Principal | Recursos Inclusos |
| :--- | :--- | :--- | :--- |
| **START** | **R$ 49,90 / mês** | O iniciante | Pedidos Kanban, Mesas, Comandas, Cadastro de Produtos. |
| **PRO** | **R$ 129,90 / mês** | O que vende iFood | Tudo do Start + **Integração iFood** + **WhatsApp Bot (Evolution)**. |
| **ELITE** | **R$ 199,90 / mês** | O escalável | Tudo do Pro + **Multi-lojas** + Estoque Avançado + BI / Relatórios. |

---

## 🏗️ Guia Técnico: Implementação Multi-Lojas

Para permitir que um proprietário gerencie diversas unidades sob a mesma conta:

1.  **Estrutura de Banco (Django):**
    - `ConfiguracaoLoja` vinculada a um `owner` (proprietário).
    - `PerfilUsuarioLoja` para vincular funcionários a unidades específicas.
2.  **Identificação (Frontend):**
    - Uso o `slug` da loja como chave primária visual em todas as telas.
    - O `AuthContext` armazena a loja selecionada.
3.  **Fluxo de Usuário:**
    - Tela de seleção de loja no login (se houver mais de uma).
    - Switcher rápido no menu lateral para alternar entre lojas sem deslogar.

---

## 🔝 Roteiro de Melhorias (Roadmap)

### 1. 🖨️ Impressão Automática
- Integração de impressão térmica direta (cozinha e copa).
- Indispensável para operações de alto volume.

### 2. 📊 Inteligência de Negócio (BI)
- Gráficos de pratos mais vendidos (Curva ABC).
- Lucro real descontando taxas de aplicativos e cartões.

### 3. 📱 QR Code na Mesa
- Cardápio digital para autoatendimento.
- Pedido cai direto no WhatsApp ou Kanban da cozinha.

### 4. 🤖 Automação de Marketing
- Recuperação de carrinho abandonado via WhatsApp (API Evolution).
- Notificações de fidelidade e promoções automáticas.

### 5. 📦 Estoque & Ficha Técnica
- Baixa automática de ingredientes por prato vendido.
- Alerta de reposição de insumos.

---

## 💳 Integração Mercado Pago

A escolha do Mercado Pago é ideal para o Brasil (Pix + recorrência simples).
- **Assinaturas:** Implementação via Webhooks para controle automático de pagamentos e bloqueio por falta de saldo/cancelamento.
- **Vantagem:** Checkout transparente integrado ao dashboard.
