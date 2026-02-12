const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../services/api');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profil')
        .setDescription('Affiche ton profil de joueur ou celui de quelqu\'un')
        .addUserOption(opt =>
            opt.setName('joueur')
                .setDescription('Le joueur Discord (par défaut toi)')
                .setRequired(false)
        ),

    async execute(interaction) {
        const user = interaction.options.getUser('joueur') || interaction.user;
        await interaction.deferReply();

        try {
            // Chercher le joueur par son ID Discord
            let joueur = null;
            try {
                const joueurRes = await api.getJoueurByDiscordId(user.id);
                joueur = joueurRes.data;
            } catch { /* pas trouvé */ }

            // Récupérer les stats
            let stats = null;
            try {
                await api.initStats(user.id);
                const statsRes = await api.getStatsByDiscordId(user.id);
                stats = statsRes.data;
            } catch { /* pas de stats */ }

            if (!joueur && !stats) {
                const embed = new EmbedBuilder()
                    .setColor(0xF39C12)
                    .setTitle('👤 Joueur non trouvé')
                    .setDescription(`**${user.displayName}** n'est lié à aucun joueur dans la base de données.\nDemande à un admin de renseigner ton ID Discord dans ta fiche joueur.`);
                return interaction.editReply({ embeds: [embed] });
            }

            // Récupérer ses OCs
            let ocs = [];
            if (joueur) {
                try {
                    const ocsRes = await api.getJoueurOCsByDiscordId(user.id);
                    ocs = ocsRes.data;
                } catch { /* pas d'OCs */ }
            }

            const ocList = ocs.length > 0
                ? ocs.map(oc => `> 🐱 **${oc.nom_OC}** — ${oc.nom_Organisation || 'Sans clan'} | 📍 ${oc.nom_Emplacement || '?'}`).join('\n')
                : '*Aucun OC enregistré*';

            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle(`👤 ${user.displayName}`)
                .setDescription(`Joueur Discord : <@${user.id}>`)
                .addFields(
                    { name: `🐱 OCs (${ocs.length})`, value: ocList, inline: false }
                )
                .setThumbnail(user.displayAvatarURL({ size: 256 }));

            // Ajouter les stats si disponibles
            if (stats) {
                const tauxReussite = stats.nbr_chasses_total > 0
                    ? Math.round((stats.nbr_captures_total / stats.nbr_chasses_total) * 100)
                    : 0;

                embed.addFields(
                    { name: '📊 Statistiques', value: '\u200b', inline: false },
                    { name: '💬 Messages', value: `${stats.nbr_messages_total}`, inline: true },
                    { name: '🏹 Chasses', value: `${stats.nbr_chasses_total}`, inline: true },
                    { name: '🎯 Captures', value: `${stats.nbr_captures_total}`, inline: true },
                    { name: '📈 Taux réussite', value: `${tauxReussite}%`, inline: true },
                    { name: '🔥 Meilleure série', value: `${stats.meilleur_serie_captures}`, inline: true },
                    { name: '🗺️ Déplacements', value: `${stats.nbr_deplacements_total}`, inline: true },
                    { name: '📅 Jours actifs', value: `${stats.nbr_jours_actifs}`, inline: true },
                    { name: '⚡ Commandes', value: `${stats.nbr_commandes_total}`, inline: true }
                );

                // Stats du jour
                embed.addFields(
                    { name: "📅 Aujourd'hui", value: `💬 ${stats.nbr_messages_aujourd_hui} msgs | 🏹 ${stats.nbr_chasses_aujourd_hui} chasses | 🎯 ${stats.nbr_captures_aujourd_hui} captures`, inline: false }
                );
            }

            if (joueur) {
                embed.setFooter({ text: `ID Joueur: ${joueur.id_Utilisateur}` });
            }

            await interaction.editReply({ embeds: [embed] });

            // Incrémenter les stats de commande
            try {
                await api.incrementStats(interaction.user.id, { nbr_commandes_total: 1 });
            } catch { /* silencieux */ }

        } catch (err) {
            const embed = new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle('❌ Erreur')
                .setDescription(err.message);
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
