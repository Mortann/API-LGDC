const api = require('../services/api');

module.exports = {
    name: 'ready',
    once: true,

    /**
     * Planifie un reset quotidien a 00:00 des compteurs de chasse de tous les OCs.
     * Appele au demarrage du bot depuis index.js.
     */
    execute(client) {
        function scheduleNextReset() {
            const now = new Date();
            const next = new Date(now);
            next.setHours(24, 0, 0, 0); // prochain minuit

            const ms = next.getTime() - now.getTime();
            console.log(`[Reset] Prochain reset dans ${Math.round(ms / 60000)} minutes (a ${next.toLocaleTimeString('fr-FR')})`);

            setTimeout(async () => {
                try {
                    await api.resetAllDaily();
                    console.log(`[Reset] Compteurs journaliers OC reinitialises (${new Date().toLocaleString('fr-FR')})`);
                } catch (err) {
                    console.error('[Reset] Erreur lors du reset quotidien OC:', err.message);
                }

                // Reset des stats journalières des joueurs
                try {
                    await api.resetDailyStats();
                    console.log(`[Reset] Compteurs journaliers Stats reinitialises (${new Date().toLocaleString('fr-FR')})`);
                } catch (err) {
                    console.error('[Reset] Erreur lors du reset quotidien Stats:', err.message);
                }

                // Incrémenter les jours actifs pour les joueurs qui ont été actifs aujourd'hui
                try {
                    const statsRes = await api.getStats();
                    for (const s of statsRes.data) {
                        if (s.nbr_messages_aujourd_hui > 0 || s.nbr_chasses_aujourd_hui > 0) {
                            await api.incrementStats(s.id_UtilisateurDiscord, { nbr_jours_actifs: 1 });
                        }
                    }
                    console.log('[Reset] Jours actifs mis a jour');
                } catch (err) {
                    console.error('[Reset] Erreur jours actifs:', err.message);
                }

                // Reprogrammer pour le jour suivant
                scheduleNextReset();
            }, ms);
        }

        scheduleNextReset();
        console.log('[Reset] Planification du reset quotidien a minuit activee');
    }
};
