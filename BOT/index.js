/**
 * Bot Discord — Lueur d'Espoir | RP LGDC
 * Point d'entrée principal.
 * 
 * Utilisation :
 *   1. Remplir le .env  (DISCORD_TOKEN, CLIENT_ID, GUILD_ID, API_URL)
 *   2. npm install
 *   3. node deploy-commands.js   (enregistre les slash commands)
 *   4. node index.js             (lance le bot)
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { Client, Collection, GatewayIntentBits } = require('discord.js');

// ── Créer le client Discord ──
const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent
    ]
});

// ── Charger les commandes ──
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFiles = fs.readdirSync(commandsPath).filter(f => f.endsWith('.js'));

for (const file of commandFiles) {
    const command = require(path.join(commandsPath, file));
    if (command.data && command.execute) {
        client.commands.set(command.data.name, command);
        console.log(`⚔️  Commande chargée : /${command.data.name}`);
    } else {
        console.warn(`⚠️  ${file} — manque "data" ou "execute"`);
    }
}

// ── Charger les events ──
const eventsPath = path.join(__dirname, 'src', 'events');
const eventFiles = fs.readdirSync(eventsPath).filter(f => f.endsWith('.js'));

for (const file of eventFiles) {
    const event = require(path.join(eventsPath, file));
    if (event.once) {
        client.once(event.name, (...args) => event.execute(...args));
    } else {
        client.on(event.name, (...args) => event.execute(...args));
    }
    console.log(`📡 Event chargé : ${event.name}`);
}

// ── Connexion ──
const TOKEN = process.env.DISCORD_TOKEN;
if (!TOKEN) {
    console.error('❌ DISCORD_TOKEN manquant dans le .env');
    process.exit(1);
}

client.login(TOKEN)
    .then(() => console.log('🚀 Bot en cours de connexion...'))
    .catch(err => {
        console.error('❌ Échec de connexion:', err.message);
        process.exit(1);
    });
