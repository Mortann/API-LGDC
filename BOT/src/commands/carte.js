const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../services/api');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('carte')
        .setDescription('Affiche les territoires et emplacements')
        .addStringOption(opt =>
            opt.setName('clan')
                .setDescription('Filtrer par clan (optionnel)')
                .setRequired(false)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        try {
            const res = await api.getOrganisations();
            const choices = res.data
                .filter(o => o.nom_Organisation.toLowerCase().includes(focused))
                .slice(0, 25)
                .map(o => ({ name: o.nom_Organisation, value: String(o.id_Organisation) }));
            await interaction.respond(choices);
        } catch {
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const orgaOpt = interaction.options.getString('clan');

            let emplacements;
            let titre;

            if (orgaOpt) {
                const res = await api.getEmplacementsByOrga(orgaOpt);
                emplacements = res.data;
                const orgaRes = await api.getOrganisation(orgaOpt);
                titre = `🗺️ Territoire — ${orgaRes.data.nom_Organisation}`;
            } else {
                const res = await api.getEmplacements();
                emplacements = res.data;
                titre = '🗺️ Tous les territoires';
            }

            if (emplacements.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0xF39C12)
                    .setTitle(titre)
                    .setDescription('Aucun emplacement trouvé.');
                return interaction.editReply({ embeds: [embed] });
            }

            // Grouper par organisation
            const groupes = {};
            emplacements.forEach(e => {
                const key = e.nom_Organisation || 'Sans territoire';
                if (!groupes[key]) groupes[key] = [];
                groupes[key].push(e);
            });

            const embed = new EmbedBuilder()
                .setColor(0xE8D5B7)
                .setTitle(titre)
                .setDescription(`${emplacements.length} emplacement(s) trouvé(s)`);

            for (const [clan, lieux] of Object.entries(groupes)) {
                const liste = lieux.map(e => {
                    const salon = e.id_SalonDiscord ? `<#${e.id_SalonDiscord}>` : '';
                    return `> 📍 **${e.nom_Emplacement}** ${salon}`;
                }).join('\n');
                embed.addFields({ name: `🏕️ ${clan}`, value: liste, inline: false });
            }

            embed.setFooter({ text: 'Utilise /proies <emplacement> pour voir le gibier disponible' });

            await interaction.editReply({ embeds: [embed] });

        } catch (err) {
            const embed = new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle('❌ Erreur')
                .setDescription(err.message);
            await interaction.editReply({ embeds: [embed] });
        }
    }
};
