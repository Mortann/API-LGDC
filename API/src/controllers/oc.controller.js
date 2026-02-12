const db = require('../config/database');

// GET /api/ocs
exports.getAll = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT oc.*, o.nom_Organisation, e.nom_Emplacement
            FROM OC oc
            JOIN Organisation o ON oc.id_Organisation = o.id_Organisation
            JOIN Emplacement e ON oc.id_Emplacement = e.id_Emplacement
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// GET /api/ocs/:id
exports.getById = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT oc.*, o.nom_Organisation, e.nom_Emplacement
            FROM OC oc
            JOIN Organisation o ON oc.id_Organisation = o.id_Organisation
            JOIN Emplacement e ON oc.id_Emplacement = e.id_Emplacement
            WHERE oc.id_OC = ?
        `, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'OC non trouvé.' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// GET /api/ocs/organisation/:id — tous les OC d'une organisation
exports.getByOrganisation = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT oc.*, o.nom_Organisation, e.nom_Emplacement
            FROM OC oc
            JOIN Organisation o ON oc.id_Organisation = o.id_Organisation
            JOIN Emplacement e ON oc.id_Emplacement = e.id_Emplacement
            WHERE oc.id_Organisation = ?
        `, [req.params.id]);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// POST /api/ocs
exports.create = async (req, res, next) => {
    try {
        const {
            nom_OC, pp_OC,
            nv_Chasse, nv_Combat, nv_Vitesse, nv_Endurance, nv_Memoire, nv_Intimidation,
            id_Organisation, id_Emplacement
        } = req.body;

        // Validation des champs requis
        if (!nom_OC || !pp_OC || id_Organisation === undefined || id_Emplacement === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Les champs nom_OC, pp_OC, id_Organisation et id_Emplacement sont requis.'
            });
        }

        const [result] = await db.query(
            `INSERT INTO OC (nom_OC, pp_OC, nv_Chasse, nv_Combat, nv_Vitesse, nv_Endurance, nv_Memoire, nv_Intimidation, nbr_Prise_Jour, nbr_Tentative, id_Organisation, id_Emplacement)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, 0, ?, ?)`,
            [
                nom_OC, pp_OC,
                nv_Chasse || 0, nv_Combat || 0, nv_Vitesse || 0, nv_Endurance || 0, nv_Memoire || 0, nv_Intimidation || 0,
                id_Organisation, id_Emplacement
            ]
        );

        res.status(201).json({
            success: true,
            data: { id_OC: result.insertId, nom_OC }
        });
    } catch (err) {
        next(err);
    }
};

// PUT /api/ocs/:id
exports.update = async (req, res, next) => {
    try {
        const {
            nom_OC, pp_OC,
            nv_Chasse, nv_Combat, nv_Vitesse, nv_Endurance, nv_Memoire, nv_Intimidation,
            id_Organisation, id_Emplacement
        } = req.body;

        const [result] = await db.query(
            `UPDATE OC SET 
                nom_OC = COALESCE(?, nom_OC),
                pp_OC = COALESCE(?, pp_OC),
                nv_Chasse = COALESCE(?, nv_Chasse),
                nv_Combat = COALESCE(?, nv_Combat),
                nv_Vitesse = COALESCE(?, nv_Vitesse),
                nv_Endurance = COALESCE(?, nv_Endurance),
                nv_Memoire = COALESCE(?, nv_Memoire),
                nv_Intimidation = COALESCE(?, nv_Intimidation),
                id_Organisation = COALESCE(?, id_Organisation),
                id_Emplacement = COALESCE(?, id_Emplacement)
             WHERE id_OC = ?`,
            [
                nom_OC, pp_OC,
                nv_Chasse, nv_Combat, nv_Vitesse, nv_Endurance, nv_Memoire, nv_Intimidation,
                id_Organisation, id_Emplacement,
                req.params.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'OC non trouvé.' });
        }

        // Récupérer l'OC mis à jour
        const [updated] = await db.query('SELECT * FROM OC WHERE id_OC = ?', [req.params.id]);
        res.json({ success: true, data: updated[0] });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/ocs/:id
exports.delete = async (req, res, next) => {
    try {
        const [result] = await db.query('DELETE FROM OC WHERE id_OC = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'OC non trouvé.' });
        }
        res.json({ success: true, message: 'OC supprimé.' });
    } catch (err) {
        next(err);
    }
};

// PUT /api/ocs/:id/deplacement — changer l'emplacement de l'OC
exports.deplacer = async (req, res, next) => {
    try {
        const { id_Emplacement } = req.body;
        if (!id_Emplacement) {
            return res.status(400).json({ success: false, message: 'Le champ id_Emplacement est requis.' });
        }
        const [result] = await db.query(
            'UPDATE OC SET id_Emplacement = ? WHERE id_OC = ?',
            [id_Emplacement, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'OC non trouvé.' });
        }
        res.json({ success: true, message: 'OC déplacé avec succès.' });
    } catch (err) {
        next(err);
    }
};

// PUT /api/ocs/:id/reset-daily — réinitialiser les compteurs journaliers
exports.resetDaily = async (req, res, next) => {
    try {
        const [result] = await db.query(
            'UPDATE OC SET nbr_Prise_Jour = 0, nbr_Tentative = 0 WHERE id_OC = ?',
            [req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'OC non trouvé.' });
        }
        res.json({ success: true, message: 'Compteurs journaliers réinitialisés.' });
    } catch (err) {
        next(err);
    }
};

// PUT /api/ocs/reset-all-daily — réinitialiser les compteurs de TOUS les OC
exports.resetAllDaily = async (req, res, next) => {
    try {
        await db.query('UPDATE OC SET nbr_Prise_Jour = 0, nbr_Tentative = 0');
        res.json({ success: true, message: 'Tous les compteurs journaliers ont été réinitialisés.' });
    } catch (err) {
        next(err);
    }
};
