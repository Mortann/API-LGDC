const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const api = require('../services/api');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('chasse')
        .setDescription('Pars chasser avec ton OC')
        .addStringOption(opt =>
            opt.setName('oc')
                .setDescription('Nom de ton OC')
                .setRequired(true)
                .setAutocomplete(true)
        ),

    async autocomplete(interaction) {
        const focused = interaction.options.getFocused().toLowerCase();
        try {
            // Ne montrer que les OCs du joueur
            const ocs = await api.getJoueurOCsByDiscordId(interaction.user.id);
            const choices = ocs.data
                .filter(oc => oc.nom_OC.toLowerCase().includes(focused))
                .slice(0, 25)
                .map(oc => ({ name: `${oc.nom_OC} (${oc.nom_Organisation || '?'})`, value: String(oc.id_OC) }));
            await interaction.respond(choices);
        } catch {
            await interaction.respond([]);
        }
    },

    async execute(interaction) {
        const idOC = interaction.options.getString('oc');
        await interaction.deferReply();

        try {
            // 1. Vérifier que l'OC appartient bien au joueur
            let joueurOCs;
            try {
                joueurOCs = await api.getJoueurOCsByDiscordId(interaction.user.id);
            } catch {
                const embed = new EmbedBuilder()
                    .setColor(0xF39C12)
                    .setTitle('👤 Joueur non trouvé')
                    .setDescription('Tu n\'es lié à aucun joueur dans la base de données.\nDemande à un admin de renseigner ton ID Discord dans ta fiche joueur.');
                return interaction.editReply({ embeds: [embed] });
            }

            const ownsOC = joueurOCs.data.some(oc => String(oc.id_OC) === String(idOC));
            if (!ownsOC) {
                const embed = new EmbedBuilder()
                    .setColor(0xE74C3C)
                    .setTitle('🚫 OC non autorisé')
                    .setDescription('Tu ne peux chasser qu\'avec **tes propres OCs** !');
                return interaction.editReply({ embeds: [embed] });
            }

            // 2. Vérifier que le salon est un emplacement enregistré
            let emplacement;
            try {
                const emplRes = await api.getEmplacementByChannel(interaction.channelId);
                emplacement = emplRes.data;
            } catch {
                const embed = new EmbedBuilder()
                    .setColor(0xF39C12)
                    .setTitle('📍 Salon non reconnu')
                    .setDescription('Ce salon n\'est pas associé à un emplacement.\nLa commande `/chasse` ne peut être utilisée que dans un salon lié à un territoire.');
                return interaction.editReply({ embeds: [embed] });
            }

            // 3. Récupérer les stats de chasse de l'OC
            const statsRes = await api.getStatsChasse(idOC);
            const stats = statsRes.data;

            if (!stats.peut_chasser) {
                const embed = new EmbedBuilder()
                    .setColor(0xE74C3C)
                    .setTitle('🚫 Chasse impossible')
                    .setDescription(
                        stats.prises_restantes <= 0
                            ? `**${stats.nom_OC}** a déjà attrapé le maximum de proies aujourd'hui !`
                            : `**${stats.nom_OC}** a épuisé toutes ses tentatives pour aujourd'hui.`
                    )
                    .addFields(
                        { name: '🎯 Prises', value: `${stats.nbr_Prise_Jour}/3`, inline: true },
                        { name: '🔄 Tentatives', value: `${stats.nbr_Tentative}/6`, inline: true }
                    );
                return interaction.editReply({ embeds: [embed] });
            }

            // 4. Récupérer les proies disponibles dans L'EMPLACEMENT DU SALON (pas de l'OC)
            const proiesRes = await api.getProiesDisponibles(emplacement.id_Emplacement);
            const proies = proiesRes.data;

            if (proies.length === 0) {
                const embed = new EmbedBuilder()
                    .setColor(0xF39C12)
                    .setTitle('🍂 Aucune proie')
                    .setDescription(`Il n'y a aucune proie disponible à **${emplacement.nom_Emplacement}**.`);
                return interaction.editReply({ embeds: [embed] });
            }

            // 5. Menu de sélection des proies
            const rareteEmojis = ['⚪', '🟢', '🔵', '🟣', '🟡', '🔴'];
            const select = new StringSelectMenuBuilder()
                .setCustomId(`chasse_proie_${idOC}_${emplacement.id_Emplacement}`)
                .setPlaceholder('🐾 Choisis ta proie...')
                .addOptions(
                    proies.map(p => ({
                        label: `${p.nom_Proie} (x${p.quantite_disponible})`,
                        description: `Rareté : ${rareteEmojis[p.nv_Rarete] || '?'} ${p.nv_Rarete}/5`,
                        value: String(p.id_Proie),
                        emoji: rareteEmojis[p.nv_Rarete] || '⚪'
                    }))
                );

            const row = new ActionRowBuilder().addComponents(select);

            const embed = new EmbedBuilder()
                .setColor(0x2ECC71)
                .setTitle(`🏹 Chasse — ${stats.nom_OC}`)
                .setDescription('Choisis la proie que tu veux chasser :')
                .addFields(
                    { name: '📍 Emplacement', value: emplacement.nom_Emplacement, inline: true },
                    { name: '🎯 Prises', value: `${stats.nbr_Prise_Jour}/3`, inline: true },
                    { name: '🔄 Tentatives', value: `${stats.nbr_Tentative}/6`, inline: true },
                    { name: '📊 Taux de base', value: `${stats.taux_base}%`, inline: true },
                    { name: '🐾 Nv. Chasse', value: `${stats.nv_Chasse}/10`, inline: true }
                )
                .setThumbnail(stats.pp_OC || null);

            await interaction.editReply({ embeds: [embed], components: [row] });

            // Incrémenter les stats de commande
            try {
                await api.initStats(interaction.user.id);
                await api.incrementStats(interaction.user.id, { nbr_commandes_total: 1 });
            } catch { /* silencieux */ }

        } catch (err) {
            const embed = new EmbedBuilder()
                .setColor(0xE74C3C)
                .setTitle('❌ Erreur')
                .setDescription(err.message);
            await interaction.editReply({ embeds: [embed] });
        }
    },

    /** Gère la sélection d'une proie dans le menu */
    async handleSelect(interaction) {
        // Format: chasse_proie_{idOC}_{idEmplacement}
        const parts = interaction.customId.split('_');
        const idOC = parts[2];
        const idEmplacement = parts[3];
        const idProie = interaction.values[0];

        await interaction.deferUpdate();

        try {
            const result = await api.tenterChasse({
                id_OC: Number(idOC),
                id_Proie: Number(idProie),
                id_Emplacement: idEmplacement ? Number(idEmplacement) : undefined
            });
            const d = result.data;

            const isCapture = d.resultat === 'CAPTURE';
            const color = isCapture ? 0x2ECC71 : 0xE74C3C;
            const emoji = isCapture ? '🎉' : '💨';

            const embed = new EmbedBuilder()
                .setColor(color)
                .setTitle(`${emoji} ${isCapture ? 'Capture réussie !' : 'Échec de la chasse...'}`)
                .setDescription(d.message)
                .setFooter({ text: `${d.oc.nom_OC} — Prises: ${3 - d.oc.prises_restantes}/3 | Tentatives: ${6 - d.oc.tentatives_restantes}/6` });

            if (d.oc.pp_OC) embed.setThumbnail(d.oc.pp_OC);

            await interaction.editReply({ embeds: [embed], components: [] });

            // Déplacer l'OC vers l'emplacement du salon si différent
            try {
                if (idEmplacement) {
                    await api.deplacerOC(idOC, { id_Emplacement: Number(idEmplacement) });
                }
            } catch { /* silencieux */ }

            // Mettre à jour les stats du joueur
            try {
                await api.initStats(interaction.user.id);
                const statsFields = {
                    nbr_chasses_total: 1,
                    nbr_chasses_aujourd_hui: 1
                };
                if (isCapture) {
                    statsFields.nbr_captures_total = 1;
                    statsFields.nbr_captures_aujourd_hui = 1;
                    statsFields.serie_captures_actuelle = 1;

                    // Enregistrer la capture dans l'historique
                    await api.addCapture({
                        id_UtilisateurDiscord: interaction.user.id,
                        id_Proie: Number(idProie),
                        id_OC: Number(idOC),
                        id_Emplacement: idEmplacement ? Number(idEmplacement) : 0,
                        taux_reussite: d.taux_reussite
                    });

                    // Vérifier/mettre à jour la meilleure série
                    try {
                        const currentStats = await api.getStatsByDiscordId(interaction.user.id);
                        const s = currentStats.data;
                        if (s.serie_captures_actuelle > s.meilleur_serie_captures) {
                            await api.setStats(interaction.user.id, {
                                meilleur_serie_captures: s.serie_captures_actuelle
                            });
                        }
                    } catch { /* silencieux */ }

                    await api.setStats(interaction.user.id, { date_derniere_capture: new Date().toISOString() });
                } else {
                    statsFields.nbr_echecs_chasse_total = 1;
                    await api.setStats(interaction.user.id, { serie_captures_actuelle: 0 });
                }
                await api.incrementStats(interaction.user.id, statsFields);
                await api.setStats(interaction.user.id, { date_derniere_chasse: new Date().toISOString() });
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
