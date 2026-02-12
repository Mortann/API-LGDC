const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const api = require('../services/api');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('deplacer')
        .setDescription('Déplace un OC vers un autre emplacement')
        .addStringOption(opt =>
            opt.setName('oc')
                .setDescription('L\'OC à déplacer')
                .setRequired(true)
                .setAutocomplete(true)
        )
        .addChannelOption(opt =>
            opt.setName('salon')
                .setDescription('Déplacer vers l\'emplacement lié à ce salon (optionnel)')
                .setRequired(false)
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        try {
            // Ne montrer que les OCs du joueur
            const res = await api.getJoueurOCsByDiscordId(interaction.user.id);
            const choices = res.data
                .filter(oc => oc.nom_OC.toLowerCase().includes(focused))
                .slice(0, 25)
                .map(oc => ({ name: `${oc.nom_OC} → ${oc.nom_Emplacement || '?'}`, value: String(oc.id_OC) }));
            await interaction.respond(choices);
        } catch {
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        const idOC = interaction.options.getString('oc');
        const channelOption = interaction.options.getChannel('salon');
        await interaction.deferReply();

        try {
            // Vérifier que l'OC appartient au joueur
            let joueurOCs;
            try {
                joueurOCs = await api.getJoueurOCsByDiscordId(interaction.user.id);
            } catch {
                const embed = new EmbedBuilder()
                    .setColor(0xF39C12)
                    .setTitle('👤 Joueur non trouvé')
                    .setDescription('Tu n\'es lié à aucun joueur dans la base de données.');
                return interaction.editReply({ embeds: [embed] });
            }

            const ownsOC = joueurOCs.data.some(oc => String(oc.id_OC) === String(idOC));
            if (!ownsOC) {
                const embed = new EmbedBuilder()
                    .setColor(0xE74C3C)
                    .setTitle('🚫 OC non autorisé')
                    .setDescription('Tu ne peux déplacer que **tes propres OCs** !');
                return interaction.editReply({ embeds: [embed] });
            }

            // Si un salon est spécifié, déplacer directement vers son emplacement
            if (channelOption) {
                let emplacement;
                try {
                    const emplRes = await api.getEmplacementByChannel(channelOption.id);
                    emplacement = emplRes.data;
                } catch {
                    const embed = new EmbedBuilder()
                        .setColor(0xF39C12)
                        .setTitle('📍 Salon non reconnu')
                        .setDescription(`Le salon <#${channelOption.id}> n'est pas associé à un emplacement.`);
                    return interaction.editReply({ embeds: [embed] });
                }

                await api.deplacerOC(idOC, { id_Emplacement: Number(emplacement.id_Emplacement) });

                const embed = new EmbedBuilder()
                    .setColor(0x2ECC71)
                    .setTitle('✅ Déplacement réussi')
                    .setDescription(`L'OC a été déplacé vers **${emplacement.nom_Emplacement}** (salon <#${channelOption.id}>) !`);

                await interaction.editReply({ embeds: [embed] });

                // Stats
                try {
                    await api.initStats(interaction.user.id);
                    await api.incrementStats(interaction.user.id, {
                        nbr_deplacements_total: 1,
                        nbr_deplacements_aujourd_hui: 1,
                        nbr_commandes_total: 1
                    });
                } catch { /* silencieux */ }

                return;
            }

            const ocRes = await api.getOC(idOC);
            const oc = ocRes.data;
            const emplRes = await api.getEmplacements();
            const emplacements = emplRes.data.filter(e => e.id_Emplacement !== oc.id_Emplacement);

            if (emplacements.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0xF39C12)
                    .setTitle('🗺️ Déplacement')
                    .setDescription('Aucun autre emplacement disponible.');
                return interaction.editReply({ embeds: [embed] });
            }

            const select = new StringSelectMenuBuilder()
                .setCustomId(`deplacer_${idOC}`)
                .setPlaceholder('📍 Choisis la destination...')
                .addOptions(
                    emplacements.slice(0, 25).map(e => ({
                        label: e.nom_Emplacement,
                        description: e.nom_Organisation || 'Territoire',
                        value: String(e.id_Emplacement)
                    }))
                );

            const row = new ActionRowBuilder().addComponents(select);

            const embed = new EmbedBuilder()
                .setColor(0x3498DB)
                .setTitle(`🗺️ Déplacer ${oc.nom_OC}`)
                .setDescription(`Actuellement à **${oc.nom_Emplacement || 'Inconnu'}**.\nChoisis la nouvelle destination :`)
                .setThumbnail(oc.pp_OC || null);

            await interaction.editReply({ embeds: [embed], components: [row] });

        } catch (err) {
            const embed = new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle('❌ Erreur')
                .setDescription(err.message);
            await interaction.editReply({ embeds: [embed] });
        }
    },

    async handleSelect(interaction) {
        const [, idOC] = interaction.customId.split('_');
        const idEmplacement = interaction.values[0];

        await interaction.deferUpdate();

        try {
            await api.deplacerOC(idOC, { id_Emplacement: Number(idEmplacement) });
            const emplRes = await api.getEmplacement(idEmplacement);
            const empl = emplRes.data;

            const embed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle('✅ Déplacement réussi')
                .setDescription(`L'OC a été déplacé vers **${empl.nom_Emplacement}** !`);

            await interaction.editReply({ embeds: [embed], components: [] });

            // Mettre à jour les stats du joueur
            try {
                await api.initStats(interaction.user.id);
                await api.incrementStats(interaction.user.id, {
                    nbr_deplacements_total: 1,
                    nbr_deplacements_aujourd_hui: 1,
                    nbr_commandes_total: 1
                });
            } catch { /* silencieux */ }

        } catch (err) {
            const embed = new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle('❌ Erreur')
                .setDescription(err.message);
            await interaction.editReply({ embeds: [embed], components: [] });
        }
    }
};
