const api = require('../services/api');

module.exports = {
    name: 'messageCreate',

    async execute(message) {
        // Ignorer les bots
        if (message.author.bot) return;

        // Incrémenter le compteur de messages du joueur
        try {
            await api.initStats(message.author.id);
            await api.incrementStats(message.author.id, {
                nbr_messages_total: 1,
                nbr_messages_aujourd_hui: 1
            });
        } catch {
            // Silencieux — ne pas bloquer les messages si l'API est down
        }
    }
};
