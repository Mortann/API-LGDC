/**
 * Enregistre les commandes slash sur Discord.
 * À exécuter une fois avec : node deploy-commands.js
 */

require('dotenv').config();
const { REST, Routes } = require('discord.js');
const fs = require('fs');
const path = require('path');

const TOKEN = process.env.DISCORD_TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

if (!TOKEN || !CLIENT_ID) {
    console.error('❌ DISCORD_TOKEN et CLIENT_ID sont requis dans le .env');
    process.exit(1);
}

// Charger toutes les commandes
const commands = [];
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data) {
        commands.push(command.data.toJSON());
        console.log(`📦 Chargée : /${command.data.name}`);
    }
}

const rest = new REST({ version: '10' }).setToken(TOKEN);

(async () => {
    try {
        console.log(`\n🔄 Enregistrement de ${commands.length} commande(s)...\n`);

        if (GUILD_ID) {
            // Mode développement : commandes sur un seul serveur (instant)
            await rest.put(
                Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
                { body: commands }
            );
            console.log(`✅ ${commands.length} commande(s) enregistrée(s) sur le serveur ${GUILD_ID}`);
        } else {
            // Mode production : commandes globales (peut prendre ~1h)
            await rest.put(
                Routes.applicationCommands(CLIENT_ID),
                { body: commands }
            );
            console.log(`✅ ${commands.length} commande(s) enregistrée(s) globalement`);
        }

    } catch (err) {
        console.error('❌ Erreur:', err);
    }
})();
