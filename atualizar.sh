#!/bin/bash
# ============================================
# Script de Atualização - RDS Pedidos
# Uso: ./atualizar.sh [servico]
# Exemplos:
#   ./atualizar.sh          → Atualiza tudo
#   ./atualizar.sh frontend → Atualiza só o frontend
# ============================================

set -e

cd /root/rds-pedidos

echo "📥 Baixando atualizações do GitHub..."
git fetch origin main && git reset --hard origin/main

if [ -z "$1" ]; then
    echo "🔨 Rebuildando TODOS os serviços..."
    docker compose build frontend backend landing-page
    docker compose up -d
else
    echo "🔨 Rebuildando serviço: $1..."
    docker compose build "$1"
    docker compose up -d "$1"
fi

echo ""
echo "📊 Status dos containers:"
docker ps --format "table {{.Names}}\t{{.Status}}"
echo ""
echo "✅ Atualização concluída!"
