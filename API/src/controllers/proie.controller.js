const db = require('../config/database');

// GET /api/proies
exports.getAll = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM Proie');
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// GET /api/proies/:id
exports.getById = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM Proie WHERE id_Proie = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Proie non trouvée.' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// GET /api/proies/:id/messages — messages associés à une proie
exports.getMessages = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT m.* 
            FROM Message m
            JOIN ListMessage lm ON m.id_Message = lm.id_Message
            WHERE lm.id_Proie = ?
        `, [req.params.id]);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// POST /api/proies
exports.create = async (req, res, next) => {
    try {
        const { nom_Proie, pp_Proie, nv_Vitesse, nv_Endurance, nv_Rarete } = req.body;
        if (!nom_Proie || !pp_Proie) {
            return res.status(400).json({ success: false, message: 'Les champs nom_Proie et pp_Proie sont requis.' });
        }

        const [result] = await db.query(
            'INSERT INTO Proie (nom_Proie, pp_Proie, nv_Vitesse, nv_Endurance, nv_Rarete) VALUES (?, ?, ?, ?, ?)',
            [nom_Proie, pp_Proie, nv_Vitesse || 0, nv_Endurance || 0, nv_Rarete || 0]
        );

        res.status(201).json({
            success: true,
            data: { id_Proie: result.insertId, nom_Proie }
        });
    } catch (err) {
        next(err);
    }
};

// PUT /api/proies/:id
exports.update = async (req, res, next) => {
    try {
        const { nom_Proie, pp_Proie, nv_Vitesse, nv_Endurance, nv_Rarete } = req.body;

        const [result] = await db.query(
            `UPDATE Proie SET 
                nom_Proie = COALESCE(?, nom_Proie),
                pp_Proie = COALESCE(?, pp_Proie),
                nv_Vitesse = COALESCE(?, nv_Vitesse),
                nv_Endurance = COALESCE(?, nv_Endurance),
                nv_Rarete = COALESCE(?, nv_Rarete)
             WHERE id_Proie = ?`,
            [nom_Proie, pp_Proie, nv_Vitesse, nv_Endurance, nv_Rarete, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Proie non trouvée.' });
        }

        const [updated] = await db.query('SELECT * FROM Proie WHERE id_Proie = ?', [req.params.id]);
        res.json({ success: true, data: updated[0] });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/proies/:id
exports.delete = async (req, res, next) => {
    try {
        const [result] = await db.query('DELETE FROM Proie WHERE id_Proie = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Proie non trouvée.' });
        }
        res.json({ success: true, message: 'Proie supprimée.' });
    } catch (err) {
        next(err);
    }
};
