const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../services/api');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Affiche les stats de chasse d\'un OC')
        .addStringOption(opt =>
            opt.setName('oc')
                .setDescription('Nom de l\'OC')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        try {
            const res = await api.getOCs();
            const choices = res.data
                .filter(oc => oc.nom_OC.toLowerCase().includes(focused))
                .slice(0, 25)
                .map(oc => ({ name: `${oc.nom_OC}`, value: String(oc.id_OC) }));
            await interaction.respond(choices);
        } catch {
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        const idOC = interaction.options.getString('oc');
        await interaction.deferReply();

        try {
            const res = await api.getStatsChasse(idOC);
            const s = res.data;

            const barre = (val, max) => {
                const pct = Math.round((val / max) * 10);
                return '🟩'.repeat(pct) + '⬛'.repeat(10 - pct);
            };

            const embed = new EmbedBuilder()
                .setColor(s.peut_chasser ? 0x2ECC71 : 0xE74C3C)
                .setTitle(`📊 Stats de chasse — ${s.nom_OC}`)
                .addFields(
                    { name: '🐾 Niveau Chasse', value: `${s.nv_Chasse}/10`, inline: true },
                    { name: '📈 Taux de base', value: `${s.taux_base}%`, inline: true },
                    { name: '🎯 Prises du jour', value: `${barre(s.nbr_Prise_Jour, 3)}\n${s.nbr_Prise_Jour}/3 (reste ${s.prises_restantes})`, inline: false },
                    { name: '🔄 Tentatives', value: `${barre(s.nbr_Tentative, 6)}\n${s.nbr_Tentative}/6 (reste ${s.tentatives_restantes})`, inline: false },
                    { name: '✅ Peut chasser', value: s.peut_chasser ? '**Oui** — Prêt(e) à chasser !' : '**Non** — Limites atteintes', inline: false }
                )
                .setThumbnail(s.pp_OC || null);

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
