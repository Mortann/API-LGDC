const { Client, GatewayIntentBits, REST, Routes } = require('discord.js');

let client = null;
let ready = false;

/**
 * Initialise et connecte le bot Discord.
 * Ne crash pas le serveur si le token est manquant.
 */
function init() {
    const token = process.env.DISCORD_BOT_TOKEN;
    if (!token) {
        console.warn('[Discord] DISCORD_BOT_TOKEN non défini — bot désactivé.');
        return null;
    }

    client = new Client({
        intents: [
            GatewayIntentBits.Guilds,
            GatewayIntentBits.GuildMembers,
            GatewayIntentBits.GuildMessages,
            GatewayIntentBits.MessageContent
        ]
    });

    client.on('ready', () => {
        ready = true;
        console.log(`[Discord] Bot connecté : ${client.user.tag}`);
    });

    client.on('error', (err) => {
        console.error('[Discord] Erreur:', err.message);
    });

    client.login(token).catch(err => {
        console.error('[Discord] Échec connexion:', err.message);
    });

    return client;
}

/**
 * Vérifie si le bot est connecté et prêt
 */
function isReady() {
    return ready && client !== null;
}

/**
 * Récupère les infos du serveur (guild) 
 */
async function getGuild() {
    if (!isReady()) return null;
    const guildId = process.env.DISCORD_GUILD_ID;
    if (!guildId) return null;
    try {
        return await client.guilds.fetch(guildId);
    } catch { return null; }
}

/**
 * Récupère la liste des salons (channels) du serveur
 */
async function getChannels() {
    const guild = await getGuild();
    if (!guild) return [];
    try {
        const channels = await guild.channels.fetch();
        return channels
            .filter(c => c.type === 0) // GUILD_TEXT = 0
            .map(c => ({
                id: c.id,
                name: c.name,
                category: c.parent?.name || null,
                position: c.position
            }))
            .sort((a, b) => a.position - b.position);
    } catch { return []; }
}

/**
 * Récupère la liste des membres du serveur
 */
async function getMembers() {
    const guild = await getGuild();
    if (!guild) return [];
    try {
        const members = await guild.members.fetch();
        return members
            .filter(m => !m.user.bot)
            .map(m => ({
                id: m.user.id,
                username: m.user.username,
                displayName: m.displayName,
                avatar: m.user.displayAvatarURL({ size: 128 }),
                roles: m.roles.cache.filter(r => r.name !== '@everyone').map(r => ({ id: r.id, name: r.name, color: r.hexColor }))
            }));
    } catch { return []; }
}

/**
 * Récupère un membre spécifique par son ID Discord
 */
async function getMember(userId) {
    const guild = await getGuild();
    if (!guild) return null;
    try {
        const member = await guild.members.fetch(userId);
        return {
            id: member.user.id,
            username: member.user.username,
            displayName: member.displayName,
            avatar: member.user.displayAvatarURL({ size: 256 }),
            roles: member.roles.cache.filter(r => r.name !== '@everyone').map(r => ({ id: r.id, name: r.name, color: r.hexColor })),
            joinedAt: member.joinedAt
        };
    } catch { return null; }
}

/**
 * Envoie un message dans un salon Discord
 */
async function sendMessage(channelId, content, embed = null) {
    if (!isReady()) throw new Error('Bot non connecté');
    try {
        const channel = await client.channels.fetch(channelId);
        if (!channel) throw new Error('Salon non trouvé');

        const payload = {};
        if (content) payload.content = content;
        if (embed) payload.embeds = [embed];

        return await channel.send(payload);
    } catch (err) {
        throw new Error(`Erreur envoi message: ${err.message}`);
    }
}

/**
 * Envoie un embed RP de résultat de chasse dans un salon
 */
async function sendChasseResult(channelId, { nomOC, ppOC, resultat, message, proie, taux }) {
    const colors = { CAPTURE: 0x22c55e, ECHEC: 0xef4444, LIMITE_PRISES: 0xf59e0b, LIMITE_TENTATIVES: 0xf59e0b };
    const titles = { CAPTURE: '🎯 Capture réussie !', ECHEC: '💨 Échec...', LIMITE_PRISES: '📦 Réserve pleine', LIMITE_TENTATIVES: '⚡ Épuisé' };

    const embed = {
        color: colors[resultat] || 0xc9a84c,
        author: { name: nomOC, icon_url: ppOC || undefined },
        title: titles[resultat] || resultat,
        description: message,
        fields: [],
        timestamp: new Date().toISOString()
    };

    if (proie) embed.fields.push({ name: 'Proie', value: proie, inline: true });
    if (taux) embed.fields.push({ name: 'Taux', value: `${taux}%`, inline: true });

    return sendMessage(channelId, null, embed);
}

/**
 * Récupère les rôles du serveur
 */
async function getRoles() {
    const guild = await getGuild();
    if (!guild) return [];
    try {
        const roles = await guild.roles.fetch();
        return roles
            .filter(r => r.name !== '@everyone')
            .map(r => ({ id: r.id, name: r.name, color: r.hexColor, position: r.position, memberCount: r.members.size }))
            .sort((a, b) => b.position - a.position);
    } catch { return []; }
}

/**
 * Attribue un rôle à un membre
 */
async function addRole(userId, roleId) {
    const guild = await getGuild();
    if (!guild) throw new Error('Serveur non trouvé');
    const member = await guild.members.fetch(userId);
    await member.roles.add(roleId);
    return true;
}

/**
 * Retire un rôle à un membre
 */
async function removeRole(userId, roleId) {
    const guild = await getGuild();
    if (!guild) throw new Error('Serveur non trouvé');
    const member = await guild.members.fetch(userId);
    await member.roles.remove(roleId);
    return true;
}

module.exports = {
    init,
    isReady,
    getGuild,
    getChannels,
    getMembers,
    getMember,
    sendMessage,
    sendChasseResult,
    getRoles,
    addRole,
    removeRole,
    getClient: () => client
};
