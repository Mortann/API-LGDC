const db = require('../config/database');

// GET /api/pnjs
exports.getAll = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT pnj.*, o.nom_Organisation, e.nom_Emplacement
            FROM PNJ pnj
            JOIN Organisation o ON pnj.id_Organisation = o.id_Organisation
            JOIN Emplacement e ON pnj.id_Emplacement = e.id_Emplacement
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// GET /api/pnjs/:id
exports.getById = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT pnj.*, o.nom_Organisation, e.nom_Emplacement
            FROM PNJ pnj
            JOIN Organisation o ON pnj.id_Organisation = o.id_Organisation
            JOIN Emplacement e ON pnj.id_Emplacement = e.id_Emplacement
            WHERE pnj.id_PNJ = ?
        `, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'PNJ non trouvé.' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// GET /api/pnjs/emplacement/:id — tous les PNJ dans un emplacement
exports.getByEmplacement = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT pnj.*, o.nom_Organisation, e.nom_Emplacement
            FROM PNJ pnj
            JOIN Organisation o ON pnj.id_Organisation = o.id_Organisation
            JOIN Emplacement e ON pnj.id_Emplacement = e.id_Emplacement
            WHERE pnj.id_Emplacement = ?
        `, [req.params.id]);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// POST /api/pnjs
exports.create = async (req, res, next) => {
    try {
        const {
            nom_PNJ, pp_PNJ,
            nv_Chasse, nv_Combat, nv_Vitesse, nv_Endurance, nv_Memoire, nv_Intimidation,
            id_Organisation, id_Emplacement
        } = req.body;

        if (!nom_PNJ || !pp_PNJ || id_Organisation === undefined || id_Emplacement === undefined) {
            return res.status(400).json({
                success: false,
                message: 'Les champs nom_PNJ, pp_PNJ, id_Organisation et id_Emplacement sont requis.'
            });
        }

        const [result] = await db.query(
            `INSERT INTO PNJ (nom_PNJ, pp_PNJ, nv_Chasse, nv_Combat, nv_Vitesse, nv_Endurance, nv_Memoire, nv_Intimidation, id_Organisation, id_Emplacement)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                nom_PNJ, pp_PNJ,
                nv_Chasse || 0, nv_Combat || 0, nv_Vitesse || 0, nv_Endurance || 0, nv_Memoire || 0, nv_Intimidation || 0,
                id_Organisation, id_Emplacement
            ]
        );

        res.status(201).json({
            success: true,
            data: { id_PNJ: result.insertId, nom_PNJ }
        });
    } catch (err) {
        next(err);
    }
};

// PUT /api/pnjs/:id
exports.update = async (req, res, next) => {
    try {
        const {
            nom_PNJ, pp_PNJ,
            nv_Chasse, nv_Combat, nv_Vitesse, nv_Endurance, nv_Memoire, nv_Intimidation,
            id_Organisation, id_Emplacement
        } = req.body;

        const [result] = await db.query(
            `UPDATE PNJ SET 
                nom_PNJ = COALESCE(?, nom_PNJ),
                pp_PNJ = COALESCE(?, pp_PNJ),
                nv_Chasse = COALESCE(?, nv_Chasse),
                nv_Combat = COALESCE(?, nv_Combat),
                nv_Vitesse = COALESCE(?, nv_Vitesse),
                nv_Endurance = COALESCE(?, nv_Endurance),
                nv_Memoire = COALESCE(?, nv_Memoire),
                nv_Intimidation = COALESCE(?, nv_Intimidation),
                id_Organisation = COALESCE(?, id_Organisation),
                id_Emplacement = COALESCE(?, id_Emplacement)
             WHERE id_PNJ = ?`,
            [
                nom_PNJ, pp_PNJ,
                nv_Chasse, nv_Combat, nv_Vitesse, nv_Endurance, nv_Memoire, nv_Intimidation,
                id_Organisation, id_Emplacement,
                req.params.id
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'PNJ non trouvé.' });
        }

        const [updated] = await db.query('SELECT * FROM PNJ WHERE id_PNJ = ?', [req.params.id]);
        res.json({ success: true, data: updated[0] });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/pnjs/:id
exports.delete = async (req, res, next) => {
    try {
        const [result] = await db.query('DELETE FROM PNJ WHERE id_PNJ = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'PNJ non trouvé.' });
        }
        res.json({ success: true, message: 'PNJ supprimé.' });
    } catch (err) {
        next(err);
    }
};
