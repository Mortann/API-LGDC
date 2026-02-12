const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../services/api');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('simuler')
        .setDescription('Simule une chasse sans la lancer')
        .addStringOption(opt =>
            opt.setName('oc')
                .setDescription('L\'OC qui chasserait')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addStringOption(opt =>
            opt.setName('proie')
                .setDescription('La proie visée')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused(true);
        const focusedValue = focused.value.toLowerCase();

        try {
            if (focused.name === 'oc') {
                const res = await api.getOCs();
                const choices = res.data
                    .filter(oc => oc.nom_OC.toLowerCase().includes(focusedValue))
                    .slice(0, 25)
                    .map(oc => ({ name: oc.nom_OC, value: String(oc.id_OC) }));
                await interaction.respond(choices);
            } else if (focused.name === 'proie') {
                const res = await api.getProies();
                const choices = res.data
                    .filter(p => p.nom_Proie.toLowerCase().includes(focusedValue))
                    .slice(0, 25)
                    .map(p => ({ name: p.nom_Proie, value: String(p.id_Proie) }));
                await interaction.respond(choices);
            }
        } catch {
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        const idOC = interaction.options.getString('oc');
        const idProie = interaction.options.getString('proie');
        await interaction.deferReply();

        try {
            const res = await api.simulerChasse(idOC, idProie);
            const d = res.data;

            const tauxColor = d.taux_final >= 70 ? 0x2ECC71
                : d.taux_final >= 40 ? 0xF39C12
                : 0xE74C3C;

            const embed = new EmbedBuilder()
                .setColor(tauxColor)
                .setTitle(`🔮 Simulation — ${d.oc} vs ${d.proie}`)
                .addFields(
                    { name: '📊 Taux de base', value: `${d.taux_base}%`, inline: true },
                    { name: '🎯 Taux final', value: `**${d.taux_final}%**`, inline: true },
                    { name: '\u200b', value: '\u200b', inline: true },
                    { name: '🌧️ Malus météo', value: `-${d.modificateurs.difficulte_temps * 5}%`, inline: true },
                    { name: '💎 Malus rareté', value: `-${d.modificateurs.rarete_proie * 3}%`, inline: true },
                    { name: '💨 Malus vitesse', value: `-${d.modificateurs.diff_vitesse * 2}%`, inline: true }
                )
                .setFooter({ text: 'Simulation uniquement — aucune tentative consommée' });

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
