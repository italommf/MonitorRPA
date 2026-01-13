# MonitorRPA

Sistema fullstack para monitoramento de execução de scripts e robôs via webhooks.

## 🚀 Quick Start

### Backend (FastAPI)

```bash
cd backend

# Create virtual environment
python -m venv venv
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/Mac

# Install dependencies
pip install -r requirements.txt

# Copy environment file
copy .env.example .env  # Windows
# cp .env.example .env  # Linux/Mac

# Run server
uvicorn app.main:app --reload --port 8000
```

API disponível em: http://localhost:8000
Documentação: http://localhost:8000/docs

### Frontend (React + Vite)

```bash
cd frontend

# Install dependencies
npm install

# Run dev server
npm run dev
```

Dashboard disponível em: http://localhost:5173

## 📡 Webhook Usage

Cada script possui uma URL única de webhook. Envie um POST para registrar execuções:

```bash
# Execução simples
curl -X POST "http://localhost:8000/webhook/YOUR-TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"status": "success"}'

# Com dados extras
curl -X POST "http://localhost:8000/webhook/YOUR-TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "success",
    "duration_ms": 1500,
    "data": {"records_processed": 100}
  }'

# Reportando erro
curl -X POST "http://localhost:8000/webhook/YOUR-TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "error",
    "error_message": "Connection timeout"
  }'
```

## 🏗️ Project Structure

```
MonitorRPA/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI entry point
│   │   ├── config.py        # Settings
│   │   ├── database.py      # SQLAlchemy setup
│   │   ├── models/          # Database models
│   │   ├── schemas/         # Pydantic schemas
│   │   ├── routers/         # API endpoints
│   │   └── services/        # Business logic
│   └── requirements.txt
│
└── frontend/
    ├── src/
    │   ├── components/      # Reusable UI components
    │   ├── pages/           # Page components
    │   ├── services/        # API client
    │   └── utils/           # Helper functions
    └── package.json
```

## 📋 Features

- ✅ CRUD de scripts monitorados
- ✅ Webhook único por script (UUID)
- ✅ Payload JSON flexível
- ✅ Histórico de execuções
- ✅ Dashboard com cards
- ✅ Filtros (nunca rodou, rodou hoje, com erro, atrasado)
- ✅ Busca por nome
- ✅ Detecção de atraso (expected_interval)
- ✅ Status visual com cores

## 🔮 Future Improvements

- 🔐 Autenticação JWT
- 📧 Alertas via email/Slack
- 📊 Gráficos e métricas
- 🐳 Docker Compose
- 🏷️ Tags para categorização
