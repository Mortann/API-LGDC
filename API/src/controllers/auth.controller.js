const jwt = require('jsonwebtoken');
const discord = require('../services/discord.service');

const JWT_SECRET = process.env.JWT_SECRET || 'lgdc-secret-key-change-me';
const DISCORD_CLIENT_ID = process.env.DISCORD_CLIENT_ID;
const DISCORD_CLIENT_SECRET = process.env.DISCORD_CLIENT_SECRET;
const DISCORD_REDIRECT_URI = process.env.DISCORD_REDIRECT_URI || 'http://localhost:5173/auth/callback';
const REQUIRED_ROLES = (process.env.DISCORD_ADMIN_ROLES || 'Admin,Moderateur,Modérateur').split(',').map(r => r.trim().toLowerCase());

/**
 * GET /api/auth/login — Redirect to Discord OAuth2
 */
exports.login = (req, res) => {
    if (!DISCORD_CLIENT_ID) {
        return res.status(500).json({ success: false, message: 'DISCORD_CLIENT_ID non configuré.' });
    }
    const params = new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        redirect_uri: DISCORD_REDIRECT_URI,
        response_type: 'code',
        scope: 'identify guilds.members.read'
    });
    res.json({ success: true, url: `https://discord.com/api/oauth2/authorize?${params}` });
};

/**
 * POST /api/auth/callback — Exchange code for token + check roles
 */
exports.callback = async (req, res, next) => {
    try {
        const { code } = req.body;
        if (!code) {
            return res.status(400).json({ success: false, message: 'Code manquant.' });
        }

        // Exchange code for access token
        const tokenRes = await fetch('https://discord.com/api/oauth2/token', {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: new URLSearchParams({
                client_id: DISCORD_CLIENT_ID,
                client_secret: DISCORD_CLIENT_SECRET,
                grant_type: 'authorization_code',
                code,
                redirect_uri: DISCORD_REDIRECT_URI
            })
        });

        const tokenData = await tokenRes.json();
        if (!tokenRes.ok || !tokenData.access_token) {
            return res.status(401).json({ success: false, message: 'Échec authentification Discord.', details: tokenData });
        }

        // Get user info
        const userRes = await fetch('https://discord.com/api/users/@me', {
            headers: { Authorization: `Bearer ${tokenData.access_token}` }
        });
        const user = await userRes.json();

        // Check guild membership + roles via bot
        const guildId = process.env.DISCORD_GUILD_ID;
        let memberRoles = [];
        let isAuthorized = false;

        if (discord.isReady() && guildId) {
            try {
                const guild = await discord.getGuild();
                if (guild) {
                    const member = await guild.members.fetch(user.id);
                    memberRoles = member.roles.cache
                        .filter(r => r.name !== '@everyone')
                        .map(r => ({ id: r.id, name: r.name, color: r.hexColor }));

                    // Check if user has one of the required roles
                    isAuthorized = memberRoles.some(r => REQUIRED_ROLES.includes(r.name.toLowerCase()));
                }
            } catch (e) {
                console.warn('[Auth] Could not fetch member roles:', e.message);
            }
        }

        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                message: 'Accès refusé. Vous devez avoir le rôle Admin ou Modérateur.',
                user: { id: user.id, username: user.username }
            });
        }

        // Create JWT
        const avatar = user.avatar
            ? `https://cdn.discordapp.com/avatars/${user.id}/${user.avatar}.png?size=128`
            : null;

        const payload = {
            id: user.id,
            username: user.username,
            displayName: user.global_name || user.username,
            avatar,
            roles: memberRoles
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });

        res.json({ success: true, token, user: payload });
    } catch (err) {
        next(err);
    }
};

/**
 * GET /api/auth/me — Verify token and return user info
 */
exports.me = async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Token manquant.' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const user = jwt.verify(token, JWT_SECRET);
        res.json({ success: true, user });
    } catch (e) {
        return res.status(401).json({ success: false, message: 'Token invalide ou expiré.' });
    }
};
