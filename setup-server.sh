#!/bin/bash
# ============================================================
#  Script de démarrage automatique — Lueur d'Espoir LGDC
#  Compatible Ubuntu Server 22.04+
#  Usage: sudo bash setup-server.sh
# ============================================================

set -e

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
USER=$(whoami)

echo "=== Lueur d'Espoir — Installation Serveur ==="
echo "Dossier projet: $PROJECT_DIR"
echo ""

# --- 1. Installer Node.js 20 si absent ---
if ! command -v node &> /dev/null; then
    echo "📦 Installation de Node.js 20..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi
echo "✅ Node.js $(node -v)"

# --- 2. Installer MySQL si absent ---
if ! command -v mysql &> /dev/null; then
    echo "📦 Installation de MySQL..."
    sudo apt-get install -y mysql-server
    sudo systemctl start mysql
    sudo systemctl enable mysql
fi
echo "✅ MySQL installé"

# --- 3. Créer la base de données ---
echo "📦 Création de la base de données lgdc_bdd..."
sudo mysql -e "CREATE DATABASE IF NOT EXISTS lgdc_bdd CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
echo "✅ Base de données prête"

# --- 4. Importer le schéma ---
if [ -f "$PROJECT_DIR/BaseDeDonne.sql" ]; then
    echo "📦 Import du schéma SQL..."
    sudo mysql lgdc_bdd < "$PROJECT_DIR/BaseDeDonne.sql" 2>/dev/null || echo "⚠️  Schéma déjà importé ou erreur (tables existantes)"
fi

# --- 5. Installer les dépendances npm ---
echo "📦 Installation des dépendances..."
cd "$PROJECT_DIR/API" && npm install --production
cd "$PROJECT_DIR/BOT" && npm install --production
cd "$PROJECT_DIR/Web" && npm install

# --- 6. Build du frontend ---
echo "📦 Build du frontend Vue.js..."
cd "$PROJECT_DIR/Web" && npm run build

# --- 7. Vérifier les .env ---
for dir in API BOT; do
    if [ ! -f "$PROJECT_DIR/$dir/.env" ]; then
        echo "⚠️  ATTENTION: $dir/.env manquant ! Copie depuis .env.example..."
        cp "$PROJECT_DIR/$dir/.env.example" "$PROJECT_DIR/$dir/.env"
        echo "   → Éditez $PROJECT_DIR/$dir/.env avec vos valeurs !"
    fi
done

# --- 8. Créer les services systemd ---
echo "📦 Création des services systemd..."

# API Service
sudo tee /etc/systemd/system/lgdc-api.service > /dev/null <<EOF
[Unit]
Description=LGDC API REST Server
After=network.target mysql.service
Wants=mysql.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/API
ExecStart=$(which node) server.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# BOT Service
sudo tee /etc/systemd/system/lgdc-bot.service > /dev/null <<EOF
[Unit]
Description=LGDC Discord Bot
After=network.target lgdc-api.service
Wants=lgdc-api.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/BOT
ExecStart=$(which node) index.js
Restart=always
RestartSec=5
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
EOF

# Web (serveur statique avec serve ou via reverse proxy)
# On utilise 'serve' pour servir le build Vue.js
npm list -g serve &>/dev/null || sudo npm install -g serve

sudo tee /etc/systemd/system/lgdc-web.service > /dev/null <<EOF
[Unit]
Description=LGDC Web Frontend
After=network.target lgdc-api.service

[Service]
Type=simple
User=$USER
WorkingDirectory=$PROJECT_DIR/Web
ExecStart=$(which serve) -s dist -l 5173
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# --- 9. Activer et démarrer les services ---
sudo systemctl daemon-reload

sudo systemctl enable lgdc-api lgdc-bot lgdc-web
sudo systemctl start lgdc-api
echo "✅ API démarrée (port 3000)"

sudo systemctl start lgdc-bot
echo "✅ Bot Discord démarré"

sudo systemctl start lgdc-web
echo "✅ Frontend démarré (port 5173)"

echo ""
echo "============================================"
echo "  🎉 Installation terminée !"
echo "============================================"
echo ""
echo "📋 Commandes utiles :"
echo "  sudo systemctl status lgdc-api    — État de l'API"
echo "  sudo systemctl status lgdc-bot    — État du Bot"
echo "  sudo systemctl status lgdc-web    — État du Frontend"
echo "  sudo journalctl -u lgdc-api -f    — Logs API en temps réel"
echo "  sudo journalctl -u lgdc-bot -f    — Logs Bot en temps réel"
echo "  sudo systemctl restart lgdc-api   — Redémarrer l'API"
echo "  sudo systemctl restart lgdc-bot   — Redémarrer le Bot"
echo "  sudo systemctl restart lgdc-web   — Redémarrer le Frontend"
echo ""
echo "⚠️  N'oubliez pas de configurer vos fichiers .env !"
echo "  → $PROJECT_DIR/API/.env"
echo "  → $PROJECT_DIR/BOT/.env"
