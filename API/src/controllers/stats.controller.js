const db = require('../config/database');

// GET /api/stats — tous les stats joueurs
exports.getAll = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM StatistiquesJoueur ORDER BY nbr_messages_total DESC');
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// GET /api/stats/discord/:discordId — stats d'un joueur par son ID Discord
exports.getByDiscordId = async (req, res, next) => {
    try {
        const [rows] = await db.query(
            'SELECT * FROM StatistiquesJoueur WHERE id_UtilisateurDiscord = ?',
            [req.params.discordId]
        );
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Stats non trouvées pour ce joueur.' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// POST /api/stats/init — initialiser les stats d'un joueur (si elles n'existent pas)
exports.init = async (req, res, next) => {
    try {
        const { id_UtilisateurDiscord } = req.body;
        if (!id_UtilisateurDiscord) {
            return res.status(400).json({ success: false, message: 'id_UtilisateurDiscord requis.' });
        }

        // Vérifier si les stats existent déjà
        const [existing] = await db.query(
            'SELECT id_Stat FROM StatistiquesJoueur WHERE id_UtilisateurDiscord = ?',
            [id_UtilisateurDiscord]
        );
        if (existing.length > 0) {
            return res.json({ success: true, data: existing[0], message: 'Stats déjà existantes.' });
        }

        // Compter le nombre d'OCs du joueur
        const [joueurRows] = await db.query(
            'SELECT * FROM Joueur WHERE id_UtilisateurDiscord = ?',
            [id_UtilisateurDiscord]
        );
        let nbrOCs = 0;
        if (joueurRows.length > 0) {
            const j = joueurRows[0];
            nbrOCs = [j.id_OC_1, j.id_OC_2, j.id_OC_3].filter(id => id != null).length;
        }

        const [result] = await db.query(
            `INSERT INTO StatistiquesJoueur (id_UtilisateurDiscord, nbr_ocs, date_premiere_activite) 
             VALUES (?, ?, NOW())`,
            [id_UtilisateurDiscord, nbrOCs]
        );

        res.status(201).json({
            success: true,
            data: { id_Stat: result.insertId, id_UtilisateurDiscord }
        });
    } catch (err) {
        next(err);
    }
};

// PUT /api/stats/increment — incrémenter un ou plusieurs compteurs
exports.increment = async (req, res, next) => {
    try {
        const { id_UtilisateurDiscord, fields } = req.body;
        // fields = { nbr_messages_total: 1, nbr_commandes_total: 1, ... }
        if (!id_UtilisateurDiscord || !fields || Object.keys(fields).length === 0) {
            return res.status(400).json({ success: false, message: 'id_UtilisateurDiscord et fields requis.' });
        }

        // Liste blanche des champs qu'on peut incrémenter
        const allowedFields = [
            'nbr_messages_total', 'nbr_messages_aujourd_hui', 'nbr_commandes_total',
            'nbr_chasses_total', 'nbr_captures_total', 'nbr_echecs_chasse_total',
            'nbr_chasses_aujourd_hui', 'nbr_captures_aujourd_hui',
            'nbr_deplacements_total', 'nbr_deplacements_aujourd_hui',
            'nbr_jours_actifs', 'serie_captures_actuelle'
        ];

        const updates = [];
        const values = [];
        for (const [key, val] of Object.entries(fields)) {
            if (allowedFields.includes(key) && typeof val === 'number') {
                updates.push(`${key} = ${key} + ?`);
                values.push(val);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'Aucun champ valide à incrémenter.' });
        }

        // Toujours mettre à jour la dernière activité
        updates.push('date_derniere_activite = NOW()');
        values.push(id_UtilisateurDiscord);

        const [result] = await db.query(
            `UPDATE StatistiquesJoueur SET ${updates.join(', ')} WHERE id_UtilisateurDiscord = ?`,
            values
        );

        if (result.affectedRows === 0) {
            // Auto-init si le joueur n'a pas encore de stats
            await db.query(
                `INSERT INTO StatistiquesJoueur (id_UtilisateurDiscord, date_premiere_activite, date_derniere_activite) 
                 VALUES (?, NOW(), NOW())`,
                [id_UtilisateurDiscord]
            );
            // Réessayer l'update
            values[values.length - 1] = id_UtilisateurDiscord;
            await db.query(
                `UPDATE StatistiquesJoueur SET ${updates.join(', ')} WHERE id_UtilisateurDiscord = ?`,
                values
            );
        }

        res.json({ success: true, message: 'Stats mises à jour.' });
    } catch (err) {
        next(err);
    }
};

// PUT /api/stats/set — mettre à jour des champs spécifiques (pas d'incrémentation)
exports.set = async (req, res, next) => {
    try {
        const { id_UtilisateurDiscord, fields } = req.body;
        if (!id_UtilisateurDiscord || !fields) {
            return res.status(400).json({ success: false, message: 'id_UtilisateurDiscord et fields requis.' });
        }

        const allowedFields = [
            'meilleur_serie_captures', 'serie_captures_actuelle',
            'proie_la_plus_capturee_id', 'proie_la_plus_capturee_nbr',
            'date_derniere_chasse', 'date_derniere_capture', 'nbr_ocs',
            'nbr_messages_aujourd_hui', 'nbr_chasses_aujourd_hui',
            'nbr_captures_aujourd_hui', 'nbr_deplacements_aujourd_hui'
        ];

        const updates = [];
        const values = [];
        for (const [key, val] of Object.entries(fields)) {
            if (allowedFields.includes(key)) {
                updates.push(`${key} = ?`);
                values.push(val);
            }
        }

        if (updates.length === 0) {
            return res.status(400).json({ success: false, message: 'Aucun champ valide.' });
        }

        values.push(id_UtilisateurDiscord);
        await db.query(
            `UPDATE StatistiquesJoueur SET ${updates.join(', ')} WHERE id_UtilisateurDiscord = ?`,
            values
        );

        res.json({ success: true, message: 'Stats mises à jour.' });
    } catch (err) {
        next(err);
    }
};

// PUT /api/stats/reset-daily — remet à 0 les compteurs journaliers de tous les joueurs
exports.resetDaily = async (req, res, next) => {
    try {
        await db.query(`
            UPDATE StatistiquesJoueur SET 
                nbr_messages_aujourd_hui = 0,
                nbr_chasses_aujourd_hui = 0,
                nbr_captures_aujourd_hui = 0,
                nbr_deplacements_aujourd_hui = 0
        `);
        res.json({ success: true, message: 'Compteurs journaliers réinitialisés.' });
    } catch (err) {
        next(err);
    }
};

// GET /api/stats/leaderboard — classement des joueurs
exports.leaderboard = async (req, res, next) => {
    try {
        const type = req.query.type || 'messages';
        let orderBy = 'nbr_messages_total';
        switch (type) {
            case 'captures': orderBy = 'nbr_captures_total'; break;
            case 'chasses': orderBy = 'nbr_chasses_total'; break;
            case 'deplacements': orderBy = 'nbr_deplacements_total'; break;
            case 'activite': orderBy = 'nbr_jours_actifs'; break;
            default: orderBy = 'nbr_messages_total';
        }
        const [rows] = await db.query(`SELECT * FROM StatistiquesJoueur ORDER BY ${orderBy} DESC LIMIT 50`);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// POST /api/stats/capture — enregistrer une capture dans l'historique
exports.addCapture = async (req, res, next) => {
    try {
        const { id_UtilisateurDiscord, id_Proie, id_OC, id_Emplacement, taux_reussite } = req.body;
        if (!id_UtilisateurDiscord || !id_Proie || !id_OC || !id_Emplacement) {
            return res.status(400).json({ success: false, message: 'Champs requis manquants.' });
        }

        await db.query(
            `INSERT INTO CapturesJoueur (id_UtilisateurDiscord, id_Proie, id_OC, id_Emplacement, taux_reussite)
             VALUES (?, ?, ?, ?, ?)`,
            [id_UtilisateurDiscord, id_Proie, id_OC, id_Emplacement, taux_reussite || null]
        );

        // Mettre à jour la proie la plus capturée
        const [captureCounts] = await db.query(`
            SELECT id_Proie, COUNT(*) as total 
            FROM CapturesJoueur 
            WHERE id_UtilisateurDiscord = ? 
            GROUP BY id_Proie 
            ORDER BY total DESC 
            LIMIT 1
        `, [id_UtilisateurDiscord]);

        if (captureCounts.length > 0) {
            await db.query(
                `UPDATE StatistiquesJoueur SET 
                    proie_la_plus_capturee_id = ?, proie_la_plus_capturee_nbr = ?
                 WHERE id_UtilisateurDiscord = ?`,
                [captureCounts[0].id_Proie, captureCounts[0].total, id_UtilisateurDiscord]
            );
        }

        res.status(201).json({ success: true, message: 'Capture enregistrée.' });
    } catch (err) {
        next(err);
    }
};

// GET /api/stats/captures/:discordId — historique des captures d'un joueur
exports.getCaptures = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT c.*, p.nom_Proie, p.pp_Proie, oc.nom_OC, e.nom_Emplacement
            FROM CapturesJoueur c
            JOIN Proie p ON c.id_Proie = p.id_Proie
            JOIN OC oc ON c.id_OC = oc.id_OC
            JOIN Emplacement e ON c.id_Emplacement = e.id_Emplacement
            WHERE c.id_UtilisateurDiscord = ?
            ORDER BY c.date_capture DESC
            LIMIT 50
        `, [req.params.discordId]);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};
