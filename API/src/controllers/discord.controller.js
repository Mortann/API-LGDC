const discord = require('../services/discord.service');

// GET /api/discord/status — état du bot
exports.getStatus = async (req, res) => {
    res.json({
        success: true,
        data: {
            connected: discord.isReady(),
            guildId: process.env.DISCORD_GUILD_ID || null
        }
    });
};

// GET /api/discord/channels — liste des salons texte
exports.getChannels = async (req, res, next) => {
    try {
        if (!discord.isReady()) return res.status(503).json({ success: false, message: 'Bot Discord non connecté.' });
        const channels = await discord.getChannels();
        res.json({ success: true, data: channels });
    } catch (err) { next(err); }
};

// GET /api/discord/members — liste des membres
exports.getMembers = async (req, res, next) => {
    try {
        if (!discord.isReady()) return res.status(503).json({ success: false, message: 'Bot Discord non connecté.' });
        const members = await discord.getMembers();
        res.json({ success: true, data: members });
    } catch (err) { next(err); }
};

// GET /api/discord/members/:id — un membre spécifique
exports.getMember = async (req, res, next) => {
    try {
        if (!discord.isReady()) return res.status(503).json({ success: false, message: 'Bot Discord non connecté.' });
        const member = await discord.getMember(req.params.id);
        if (!member) return res.status(404).json({ success: false, message: 'Membre non trouvé.' });
        res.json({ success: true, data: member });
    } catch (err) { next(err); }
};

// GET /api/discord/roles — liste des rôles
exports.getRoles = async (req, res, next) => {
    try {
        if (!discord.isReady()) return res.status(503).json({ success: false, message: 'Bot Discord non connecté.' });
        const roles = await discord.getRoles();
        res.json({ success: true, data: roles });
    } catch (err) { next(err); }
};

// POST /api/discord/send — envoyer un message dans un salon
exports.sendMessage = async (req, res, next) => {
    try {
        if (!discord.isReady()) return res.status(503).json({ success: false, message: 'Bot Discord non connecté.' });
        const { channelId, content, embed } = req.body;
        if (!channelId) return res.status(400).json({ success: false, message: 'channelId requis.' });
        if (!content && !embed) return res.status(400).json({ success: false, message: 'content ou embed requis.' });
        await discord.sendMessage(channelId, content, embed);
        res.json({ success: true, message: 'Message envoyé.' });
    } catch (err) { next(err); }
};

// POST /api/discord/roles/:userId/:roleId — ajouter un rôle
exports.addRole = async (req, res, next) => {
    try {
        if (!discord.isReady()) return res.status(503).json({ success: false, message: 'Bot Discord non connecté.' });
        await discord.addRole(req.params.userId, req.params.roleId);
        res.json({ success: true, message: 'Rôle ajouté.' });
    } catch (err) { next(err); }
};

// DELETE /api/discord/roles/:userId/:roleId — retirer un rôle
exports.removeRole = async (req, res, next) => {
    try {
        if (!discord.isReady()) return res.status(503).json({ success: false, message: 'Bot Discord non connecté.' });
        await discord.removeRole(req.params.userId, req.params.roleId);
        res.json({ success: true, message: 'Rôle retiré.' });
    } catch (err) { next(err); }
};
