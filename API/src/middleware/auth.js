const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'lgdc-secret-key-change-me';

/**
 * Middleware d'authentification — vérifie le token JWT
 * Ajoute req.user si valide
 */
function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, message: 'Authentification requise.' });
    }

    try {
        const token = authHeader.split(' ')[1];
        req.user = jwt.verify(token, JWT_SECRET);
        next();
    } catch (e) {
        return res.status(401).json({ success: false, message: 'Token invalide ou expiré.' });
    }
}

module.exports = requireAuth;
