require('dotenv').config();
const express = require('express');
const cors = require('cors');
const routes = require('./src/routes');
const errorHandler = require('./src/middleware/errorHandler');
const discord = require('./src/services/discord.service');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware globaux
app.use(cors());
app.use(express.json());

// Route de base - vérification que l'API fonctionne
app.get('/', (req, res) => {
    res.json({
        message: 'API Lueur d Espoir | RP LGDC - En ligne !',
        version: '1.0.0',
        endpoints: {
            organisations: '/api/organisations',
            emplacements: '/api/emplacements',
            ocs: '/api/ocs',
            pnjs: '/api/pnjs',
            joueurs: '/api/joueurs',
            proies: '/api/proies',
            temps: '/api/temps',
            spawnProies: '/api/spawn-proies',
            messages: '/api/messages',
            chasse: '/api/chasse'
        }
    });
});

// Routes de l'API
app.use('/api', routes);

// Gestion des erreurs
app.use(errorHandler);

// Démarrage du serveur
app.listen(PORT, () => {
    console.log(`API Lueur d'Espoir | RP LGDC démarrée sur le port ${PORT}`);
    console.log(`http://localhost:${PORT}`);

    // Initialiser le bot Discord (optionnel, ne crash pas si pas de token)
    discord.init();
});
