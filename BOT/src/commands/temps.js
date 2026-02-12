const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../services/api');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('temps')
        .setDescription('Affiche la météo et la difficulté actuelle'),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const res = await api.getTemps();
            const temps = res.data;

            if (temps.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0xF39C12)
                    .setTitle('🌦️ Météo')
                    .setDescription('Aucune condition météo enregistrée.');
                return interaction.editReply({ embeds: [embed] });
            }

            const meteoEmojis = {
                0: '☀️', 1: '🌤️', 2: '⛅', 3: '🌧️', 4: '⛈️', 5: '🌩️',
                6: '❄️', 7: '🌨️', 8: '🌫️', 9: '🌪️', 10: '☄️'
            };

            const lignes = temps.map(t => {
                const emoji = meteoEmojis[t.nv_difficulte] || '🌡️';
                const barre = '🟥'.repeat(t.nv_difficulte) + '⬜'.repeat(10 - t.nv_difficulte);
                return `${emoji} **${t.nom_Temps}** — Difficulté : ${t.nv_difficulte}/10\n> ${barre}`;
            });

            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle('🌦️ Conditions météo actuelles')
                .setDescription(lignes.join('\n\n'))
                .setFooter({ text: `${temps.length} condition(s) enregistrée(s)` });

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
