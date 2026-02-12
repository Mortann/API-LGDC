const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const api = require('../services/api');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('reset')
        .setDescription('Réinitialise les compteurs journaliers de chasse')
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
        .addStringOption(opt =>
            opt.setName('cible')
                .setDescription('Un OC précis ou tous les OCs')
                .setRequired(true)
                .addChoices(
                    { name: 'Tous les OCs', value: 'all' },
                    { name: 'Un seul OC', value: 'one' }
                )
        )
        .addStringOption(opt =>
            opt.setName('oc')
                .setDescription('L\'OC à reset (si "Un seul OC" choisi)')
                .setRequired(false)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        try {
            const res = await api.getOCs();
            const choices = res.data
                .filter(oc => oc.nom_OC.toLowerCase().includes(focused))
                .slice(0, 25)
                .map(oc => ({ name: oc.nom_OC, value: String(oc.id_OC) }));
            await interaction.respond(choices);
        } catch {
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        const cible = interaction.options.getString('cible');
        const idOC = interaction.options.getString('oc');
        await interaction.deferReply({ ephemeral: true });

        try {
            if (cible === 'all') {
                await api.resetAllDaily();
                const embed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('✅ Reset global')
                    .setDescription('Les compteurs journaliers de **tous les OCs** ont été réinitialisés !');
                return interaction.editReply({ embeds: [embed] });
            }

            if (!idOC) {
                const embed = new EmbedBuilder()
                    .setColor(0xF39C12)
                    .setTitle('⚠️ OC manquant')
                    .setDescription('Tu dois spécifier un OC si tu choisis "Un seul OC".');
                return interaction.editReply({ embeds: [embed] });
            }

            await api.resetDailyOC(idOC);
            const ocRes = await api.getOC(idOC);

            const embed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle('✅ Reset OC')
                .setDescription(`Les compteurs de **${ocRes.data.nom_OC}** ont été réinitialisés !`);

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
