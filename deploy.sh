#!/bin/bash
# deploy.sh — Déploiement sur VPS Infomaniak Ubuntu 22.04
# Usage : bash deploy.sh

set -e
echo "🚀 Déploiement Trading Dashboard..."

# ── 1. Dépendances système ─────────────────────────────────────────────────
sudo apt update && sudo apt install -y python3.11 python3.11-venv python3-pip nginx

# ── 2. Backend Python ──────────────────────────────────────────────────────
cd /opt/trading/backend
python3.11 -m venv venv
source venv/bin/activate
pip install --upgrade pip
pip install -r requirements.txt

cp .env.example .env
echo "⚠️  Edite /opt/trading/backend/.env avec ta clé Finnhub"

# ── 3. Service systemd backend ─────────────────────────────────────────────
sudo tee /etc/systemd/system/trading-api.service > /dev/null <<EOF
[Unit]
Description=Trading Dashboard FastAPI
After=network.target

[Service]
User=www-data
WorkingDirectory=/opt/trading/backend
Environment="PATH=/opt/trading/backend/venv/bin"
ExecStart=/opt/trading/backend/venv/bin/uvicorn main:app --host 127.0.0.1 --port 8000 --workers 1
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable trading-api
sudo systemctl start trading-api
echo "✅ API backend démarrée sur :8000"

# ── 4. Frontend build ──────────────────────────────────────────────────────
cd /opt/trading/frontend
npm install
npm run build

# ── 5. Nginx ───────────────────────────────────────────────────────────────
sudo tee /etc/nginx/sites-available/trading > /dev/null <<EOF
server {
    listen 80;
    server_name _;

    root /opt/trading/frontend/dist;
    index index.html;

    # Frontend React (SPA)
    location / {
        try_files \$uri \$uri/ /index.html;
    }

    # Proxy API vers FastAPI
    location /api/ {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/trading /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
echo "✅ Nginx configuré"
echo ""
echo "🎉 Déploiement terminé ! Dashboard accessible sur http://IP_VPS"
echo "📱 Ajoute à l'écran d'accueil iOS/Android pour l'utiliser comme app"
