const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const api = require('../services/api');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('proies')
        .setDescription('Affiche les proies disponibles dans un emplacement')
        .addStringOption(opt =>
            opt.setName('emplacement')
                .setDescription('L\'emplacement à inspecter')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        try {
            const res = await api.getEmplacements();
            const choices = res.data
                .filter(e => e.nom_Emplacement.toLowerCase().includes(focused))
                .slice(0, 25)
                .map(e => ({ name: `${e.nom_Emplacement} (${e.nom_Organisation || '?'})`, value: String(e.id_Emplacement) }));
            await interaction.respond(choices);
        } catch {
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        const idEmpl = interaction.options.getString('emplacement');
        await interaction.deferReply();

        try {
            const proiesRes = await api.getProiesDisponibles(idEmpl);
            const emplRes = await api.getEmplacement(idEmpl);
            const proies = proiesRes.data;
            const empl = emplRes.data;

            if (proies.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0xF39C12)
                    .setTitle('🍂 Aucune proie')
                    .setDescription(`Aucune proie disponible à **${empl.nom_Emplacement}**.`);
                return interaction.editReply({ embeds: [embed] });
            }

            const rareteEmojis = ['⚪', '🟢', '🔵', '🟣', '🟡', '🔴'];
            const lignes = proies.map(p => {
                const emoji = rareteEmojis[p.nv_Rarete] || '⚪';
                return `${emoji} **${p.nom_Proie}** — x${p.quantite_disponible} (rareté ${p.nv_Rarete}/5)`;
            });

            const embed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle(`🐾 Proies — ${empl.nom_Emplacement}`)
                .setDescription(lignes.join('\n'))
                .setFooter({ text: `${proies.length} type(s) de proie disponible(s)` });

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
