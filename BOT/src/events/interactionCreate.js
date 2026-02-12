module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // ── Autocomplete ──
        if (interaction.isAutocomplete()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command?.autocomplete) return;

            try {
                await command.autocomplete(interaction);
            } catch (err) {
                console.error(`[Autocomplete] ${interaction.commandName}:`, err.message);
            }
            return;
        }

        // ── Slash Commands ──
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);
            if (!command) {
                console.warn(`[Commande] Commande inconnue : ${interaction.commandName}`);
                return;
            }

            try {
                await command.execute(interaction);
            } catch (err) {
                console.error(`[Commande] ${interaction.commandName}:`, err);
                const reply = {
                    content: `❌ Une erreur est survenue : ${err.message}`,
                    ephemeral: true
                };
                if (interaction.deferred || interaction.replied) {
                    await interaction.editReply(reply).catch(() => {});
                } else {
                    await interaction.reply(reply).catch(() => {});
                }
            }
            return;
        }

        // ── Select Menus ──
        if (interaction.isStringSelectMenu()) {
            const customId = interaction.customId;

            // Chasse — sélection de proie (format: chasse_proie_{idOC}_{idEmplacement})
            if (customId.startsWith('chasse_proie_')) {
                const chasse = interaction.client.commands.get('chasse');
                if (chasse?.handleSelect) {
                    try {
                        await chasse.handleSelect(interaction);
                    } catch (err) {
                        console.error('[Select] chasse:', err);
                    }
                }
                return;
            }

            // Déplacement — sélection d'emplacement
            if (customId.startsWith('deplacer_')) {
                const deplacer = interaction.client.commands.get('deplacer');
                if (deplacer?.handleSelect) {
                    try {
                        await deplacer.handleSelect(interaction);
                    } catch (err) {
                        console.error('[Select] deplacer:', err);
                    }
                }
                return;
            }

            console.warn(`[Select] Menu inconnu : ${customId}`);
        }
    }
};
