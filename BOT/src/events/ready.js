const { ActivityType } = require('discord.js');

module.exports = {
    name: 'ready',
    once: true,
    execute(client) {
        console.log(`✅ Bot connecté en tant que ${client.user.tag}`);
        console.log(`📡 ${client.guilds.cache.size} serveur(s)`);
        console.log(`🎮 ${client.commands.size} commande(s) chargée(s)`);

        // Status du bot
        client.user.setPresence({
            activities: [{
                name: '🏹 Lueur dEspoir | RP LGDC',
                type: ActivityType.Playing
            }],
            status: 'online'
        });
    }
};
