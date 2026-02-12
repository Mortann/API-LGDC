const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../services/api');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('oc')
        .setDescription('Affiche les infos d\'un OC')
        .addStringOption(opt =>
            opt.setName('nom')
                .setDescription('Nom de l\'OC à afficher')
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
                .map(oc => ({ name: `${oc.nom_OC} (${oc.nom_Organisation || '?'})`, value: String(oc.id_OC) }));
            await interaction.respond(choices);
        } catch {
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        const idOC = interaction.options.getString('nom');
        await interaction.deferReply();

        try {
            const res = await api.getOC(idOC);
            const oc = res.data;

            const barreNiveau = (nv, max = 10) => {
                const plein = '█'.repeat(nv);
                const vide = '░'.repeat(max - nv);
                return `${plein}${vide} ${nv}/${max}`;
            };

            const embed = new EmbedBuilder()
                .setColor(getClanColor(oc.nom_Organisation))
                .setTitle(`🐱 ${oc.nom_OC}`)
                .setDescription(oc.description_OC || '*Aucune description*')
                .addFields(
                    { name: '🏕️ Clan', value: oc.nom_Organisation || 'Aucun', inline: true },
                    { name: '📍 Emplacement', value: oc.nom_Emplacement || 'Inconnu', inline: true },
                    { name: '👤 Joueur', value: oc.nom_Joueur || 'Aucun', inline: true },
                    { name: '🏹 Chasse', value: barreNiveau(oc.nv_Chasse || 0), inline: false },
                    { name: '💨 Vitesse', value: barreNiveau(oc.nv_Vitesse || 0), inline: false },
                    { name: '🎯 Prises du jour', value: `${oc.nbr_Prise_Jour || 0}/3`, inline: true },
                    { name: '🔄 Tentatives', value: `${oc.nbr_Tentative || 0}/6`, inline: true }
                )
                .setThumbnail(oc.pp_OC || null)
                .setFooter({ text: `ID: ${oc.id_OC}` });

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

function getClanColor(nom) {
    if (!nom) return 0x808080;
    const n = nom.toLowerCase();
    if (n.includes('rivière') || n.includes('rive')) return 0x3498DB;
    if (n.includes('ombre')) return 0xE74C3C;
    if (n.includes('forêt') || n.includes('tonnerre')) return 0x2ECC71;
    if (n.includes('vent')) return 0xF1C40F;
    if (n.includes('étoile') || n.includes('ciel')) return 0x9B59B6;
    return 0x95A5A6;
}
