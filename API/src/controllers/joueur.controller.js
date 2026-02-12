const db = require('../config/database');

// GET /api/joueurs
exports.getAll = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT j.*, 
                   oc1.nom_OC AS nom_OC_1, 
                   oc2.nom_OC AS nom_OC_2, 
                   oc3.nom_OC AS nom_OC_3
            FROM Joueur j
            JOIN OC oc1 ON j.id_OC_1 = oc1.id_OC
            LEFT JOIN OC oc2 ON j.id_OC_2 = oc2.id_OC
            LEFT JOIN OC oc3 ON j.id_OC_3 = oc3.id_OC
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// GET /api/joueurs/:id
exports.getById = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT j.*, 
                   oc1.nom_OC AS nom_OC_1, 
                   oc2.nom_OC AS nom_OC_2, 
                   oc3.nom_OC AS nom_OC_3
            FROM Joueur j
            JOIN OC oc1 ON j.id_OC_1 = oc1.id_OC
            LEFT JOIN OC oc2 ON j.id_OC_2 = oc2.id_OC
            LEFT JOIN OC oc3 ON j.id_OC_3 = oc3.id_OC
            WHERE j.id_Utilisateur = ?
        `, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Joueur non trouvé.' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// GET /api/joueurs/:id/ocs — tous les OC d'un joueur
exports.getOCs = async (req, res, next) => {
    try {
        const [joueur] = await db.query('SELECT * FROM Joueur WHERE id_Utilisateur = ?', [req.params.id]);
        if (joueur.length === 0) {
            return res.status(404).json({ success: false, message: 'Joueur non trouvé.' });
        }

        const ocIds = [joueur[0].id_OC_1, joueur[0].id_OC_2, joueur[0].id_OC_3].filter(id => id !== null);
        if (ocIds.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const [ocs] = await db.query(`
            SELECT oc.*, o.nom_Organisation, e.nom_Emplacement
            FROM OC oc
            JOIN Organisation o ON oc.id_Organisation = o.id_Organisation
            JOIN Emplacement e ON oc.id_Emplacement = e.id_Emplacement
            WHERE oc.id_OC IN (?)
        `, [ocIds]);

        res.json({ success: true, data: ocs });
    } catch (err) {
        next(err);
    }
};

// GET /api/joueurs/discord/:discordId — joueur par ID Discord
exports.getByDiscordId = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT j.*, 
                   oc1.nom_OC AS nom_OC_1, 
                   oc2.nom_OC AS nom_OC_2, 
                   oc3.nom_OC AS nom_OC_3
            FROM Joueur j
            JOIN OC oc1 ON j.id_OC_1 = oc1.id_OC
            LEFT JOIN OC oc2 ON j.id_OC_2 = oc2.id_OC
            LEFT JOIN OC oc3 ON j.id_OC_3 = oc3.id_OC
            WHERE j.id_UtilisateurDiscord = ?
        `, [req.params.discordId]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Joueur non trouvé.' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// GET /api/joueurs/discord/:discordId/ocs — OCs d'un joueur par ID Discord
exports.getOCsByDiscordId = async (req, res, next) => {
    try {
        const [joueur] = await db.query('SELECT * FROM Joueur WHERE id_UtilisateurDiscord = ?', [req.params.discordId]);
        if (joueur.length === 0) {
            return res.status(404).json({ success: false, message: 'Joueur non trouvé.' });
        }

        const ocIds = [joueur[0].id_OC_1, joueur[0].id_OC_2, joueur[0].id_OC_3].filter(id => id !== null);
        if (ocIds.length === 0) {
            return res.json({ success: true, data: [] });
        }

        const [ocs] = await db.query(`
            SELECT oc.*, o.nom_Organisation, e.nom_Emplacement
            FROM OC oc
            JOIN Organisation o ON oc.id_Organisation = o.id_Organisation
            JOIN Emplacement e ON oc.id_Emplacement = e.id_Emplacement
            WHERE oc.id_OC IN (?)
        `, [ocIds]);

        res.json({ success: true, data: ocs });
    } catch (err) {
        next(err);
    }
};

// POST /api/joueurs
exports.create = async (req, res, next) => {
    try {
        const { id_UtilisateurDiscord, id_OC_1, id_OC_2, id_OC_3 } = req.body;
        if (!id_OC_1) {
            return res.status(400).json({ success: false, message: 'Le champ id_OC_1 est requis (au moins un OC).' });
        }
        if (!id_UtilisateurDiscord) {
            return res.status(400).json({ success: false, message: 'Le champ id_UtilisateurDiscord est requis.' });
        }

        const [result] = await db.query(
            'INSERT INTO Joueur (id_UtilisateurDiscord, id_OC_1, id_OC_2, id_OC_3) VALUES (?, ?, ?, ?)',
            [id_UtilisateurDiscord, id_OC_1, id_OC_2 || null, id_OC_3 || null]
        );

        res.status(201).json({
            success: true,
            data: { id_Utilisateur: result.insertId, id_UtilisateurDiscord, id_OC_1, id_OC_2, id_OC_3 }
        });
    } catch (err) {
        next(err);
    }
};

// PUT /api/joueurs/:id
exports.update = async (req, res, next) => {
    try {
        const { id_UtilisateurDiscord, id_OC_1, id_OC_2, id_OC_3 } = req.body;

        const [result] = await db.query(
            `UPDATE Joueur SET 
                id_UtilisateurDiscord = COALESCE(?, id_UtilisateurDiscord),
                id_OC_1 = COALESCE(?, id_OC_1),
                id_OC_2 = ?,
                id_OC_3 = ?
             WHERE id_Utilisateur = ?`,
            [id_UtilisateurDiscord, id_OC_1, id_OC_2 !== undefined ? id_OC_2 : null, id_OC_3 !== undefined ? id_OC_3 : null, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Joueur non trouvé.' });
        }

        const [updated] = await db.query('SELECT * FROM Joueur WHERE id_Utilisateur = ?', [req.params.id]);
        res.json({ success: true, data: updated[0] });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/joueurs/:id
exports.delete = async (req, res, next) => {
    try {
        const [result] = await db.query('DELETE FROM Joueur WHERE id_Utilisateur = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Joueur non trouvé.' });
        }
        res.json({ success: true, message: 'Joueur supprimé.' });
    } catch (err) {
        next(err);
    }
};
