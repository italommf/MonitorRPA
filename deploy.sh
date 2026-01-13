#!/bin/bash

# Script de Deploy de Produção - MonitorRPA
# Este script realiza o deploy da aplicação em ambiente de produção

set -e  # Encerra o script em caso de erro

echo "🚀 Deploy de Produção - MonitorRPA"
echo "======================================="

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # Sem cor

# Verifica se o arquivo .env existe (Opcional para este projeto, variáveis estão no compose)
if [ -f .env ]; then
    echo "⚙️ Carregando variáveis do arquivo .env..."
    set -a
    source .env
    set +a
    echo -e "${GREEN}✓${NC} Variáveis de ambiente carregadas"
fi

# Passo 1: Puxar o código mais recente
echo ""
echo "📥 Puxando o código mais recente do GitHub..."
git pull origin main || {
    echo -e "${YELLOW}Aviso: Não foi possível fazer o git pull. Continuando...${NC}"
}

# Passo 2: Preparar diretório de dados
echo ""
echo "� Preparando diretório de dados..."
mkdir -p backend/data

# Passo 3: Construir e iniciar os containers
echo ""
echo "� Construindo e iniciando os containers Docker..."
docker compose -f docker-compose.prod.yml build
docker compose -f docker-compose.prod.yml up -d

echo -e "${GREEN}✓${NC} Containers iniciados"

# Passo 4: Verificar saúde dos serviços
echo ""
echo "🏥 Verificando a saúde dos serviços..."
sleep 5

if docker compose -f docker-compose.prod.yml ps | grep -q "Up"; then
    echo -e "${GREEN}✓${NC} Os serviços estão rodando corretamente"
else
    echo -e "${RED}⨯${NC} Alguns serviços falharam ao iniciar"
    docker compose -f docker-compose.prod.yml ps
    exit 1
fi

# Passo 5: Mostrar status dos serviços
echo ""
echo "📊 Status dos Serviços:"
docker compose -f docker-compose.prod.yml ps

echo ""
echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}🎉 Deploy concluído com sucesso!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Acesse sua aplicação em:"
echo "  • MonitorRPA: http://rpa.italommf.com.br (Certifique-se de configurar o Nginx Proxy)"
echo ""
echo "Para ver os logs:"
echo "  docker compose -f docker-compose.prod.yml logs -f"
echo ""
echo "Para parar os serviços:"
echo "  docker compose -f docker-compose.prod.yml down"
echo ""
