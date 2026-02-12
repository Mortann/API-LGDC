# Lueur d'Espoir — RP LGDC

Projet complet pour un serveur Discord roleplay "La Guerre des Clans" avec :
- **API** : REST API Node.js + Express + MySQL
- **Web** : Interface d'administration Vue.js 3
- **BOT** : Bot Discord avec commandes slash

---

## 📋 Prérequis

- **Node.js** 18+ (recommandé : 20)
- **MySQL** 8.0+
- **npm** 9+

---

## 🔧 Variables d'environnement

### API (`API/.env`)

| Variable | Description | Exemple |
|---|---|---|
| `DB_HOST` | Hôte MySQL | `localhost` |
| `DB_PORT` | Port MySQL | `3306` |
| `DB_USER` | Utilisateur MySQL | `root` |
| `DB_PASSWORD` | Mot de passe MySQL | `monpass` |
| `DB_NAME` | Nom de la base | `lgdc_bdd` |
| `PORT` | Port de l'API | `3000` |
| `DISCORD_BOT_TOKEN` | Token du bot Discord | `MTI5...` |
| `DISCORD_GUILD_ID` | ID du serveur Discord | `1370409755058634873` |
| `DISCORD_CLIENT_ID` | Client ID Discord OAuth2 | `1291431574780252233` |
| `DISCORD_CLIENT_SECRET` | Client Secret Discord OAuth2 | `FVwD1d...` |
| `DISCORD_REDIRECT_URI` | URL de callback OAuth2 | `http://localhost:5173/auth/callback` |
| `JWT_SECRET` | Secret pour les tokens JWT | `votre-secret-unique` |

### BOT (`BOT/.env`)

| Variable | Description | Exemple |
|---|---|---|
| `DISCORD_TOKEN` | Token du bot Discord | `MTI5...` |
| `GUILD_ID` | ID du serveur Discord | `1370409755058634873` |
| `CLIENT_ID` | Client ID du bot | `1291431574780252233` |
| `API_URL` | URL complète de l'API | `http://localhost:3000/api` |

---

## 🚀 Lancement en développement (Windows/Linux/Mac)

### 1. Base de données
```bash
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS lgdc_bdd"
mysql -u root -p lgdc_bdd < BaseDeDonne.sql
```

### 2. API
```bash
cd API
cp .env.example .env   # Puis éditer avec vos valeurs
npm install
node server.js
# → http://localhost:3000
```

### 3. Bot Discord
```bash
cd BOT
cp .env.example .env   # Puis éditer avec vos valeurs
node deploy-commands.js  # Enregistrer les commandes slash (une seule fois)
node index.js
```

### 4. Frontend Web
```bash
cd Web
npm install
npm run dev
# → http://localhost:5173
```

---

## 🖥️ Déploiement Ubuntu Server

### Installation automatique

```bash
# Cloner le projet
git clone <url-du-repo> /opt/lgdc
cd /opt/lgdc

# Configurer les .env
cp API/.env.example API/.env && nano API/.env
cp BOT/.env.example BOT/.env && nano BOT/.env

# Lancer le script d'installation
sudo bash setup-server.sh
```

Le script `setup-server.sh` :
- Installe Node.js 20 et MySQL
- Crée la base de données et importe le schéma
- Installe les dépendances npm
- Build le frontend Vue.js
- Crée 3 services systemd (lgdc-api, lgdc-bot, lgdc-web)
- Active le démarrage automatique au boot

### Commandes de gestion

```bash
# État des services
sudo systemctl status lgdc-api
sudo systemctl status lgdc-bot
sudo systemctl status lgdc-web

# Logs en temps réel
sudo journalctl -u lgdc-api -f
sudo journalctl -u lgdc-bot -f

# Redémarrer
sudo systemctl restart lgdc-api
sudo systemctl restart lgdc-bot
sudo systemctl restart lgdc-web

# Arrêter
sudo systemctl stop lgdc-api lgdc-bot lgdc-web
```

### Mise à jour

```bash
cd /opt/lgdc
git pull
cd API && npm install --production
cd ../BOT && npm install --production
cd ../Web && npm install && npm run build
sudo systemctl restart lgdc-api lgdc-bot lgdc-web
```

---

## 📁 Structure du projet

```
API-LGDC/
├── API/                    # REST API (Express + MySQL)
│   ├── server.js           # Point d'entrée
│   ├── src/
│   │   ├── config/         # database.js
│   │   ├── controllers/    # Logique métier
│   │   ├── middleware/      # Auth JWT
│   │   └── routes/         # Routes Express
│   ├── .env.example
│   └── package.json
├── BOT/                    # Bot Discord
│   ├── index.js            # Point d'entrée
│   ├── deploy-commands.js  # Enregistrement slash commands
│   ├── src/
│   │   ├── commands/       # Commandes slash (10)
│   │   ├── events/         # Events Discord (4)
│   │   └── services/       # Client API
│   ├── .env.example
│   └── package.json
├── Web/                    # Frontend Vue.js
│   ├── src/
│   │   ├── pages/          # Pages (16+)
│   │   ├── services/       # Client API
│   │   ├── router.js
│   │   └── App.vue
│   └── package.json
├── BaseDeDonne.sql         # Schéma SQL complet
├── setup-server.sh         # Script d'installation Ubuntu
└── README.md
```
