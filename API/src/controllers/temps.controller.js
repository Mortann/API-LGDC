const db = require('../config/database');

// GET /api/temps
exports.getAll = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM Temps');
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// GET /api/temps/:id
exports.getById = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM Temps WHERE id_Temps = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Temps non trouvé.' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// POST /api/temps
exports.create = async (req, res, next) => {
    try {
        const { nv_difficulte } = req.body;
        if (nv_difficulte === undefined) {
            return res.status(400).json({ success: false, message: 'Le champ nv_difficulte est requis.' });
        }

        const [result] = await db.query(
            'INSERT INTO Temps (nv_difficulte) VALUES (?)',
            [nv_difficulte]
        );

        res.status(201).json({
            success: true,
            data: { id_Temps: result.insertId, nv_difficulte }
        });
    } catch (err) {
        next(err);
    }
};

// PUT /api/temps/:id
exports.update = async (req, res, next) => {
    try {
        const { nv_difficulte } = req.body;
        if (nv_difficulte === undefined) {
            return res.status(400).json({ success: false, message: 'Le champ nv_difficulte est requis.' });
        }

        const [result] = await db.query(
            'UPDATE Temps SET nv_difficulte = ? WHERE id_Temps = ?',
            [nv_difficulte, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Temps non trouvé.' });
        }
        res.json({ success: true, data: { id_Temps: parseInt(req.params.id), nv_difficulte } });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/temps/:id
exports.delete = async (req, res, next) => {
    try {
        const [result] = await db.query('DELETE FROM Temps WHERE id_Temps = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Temps non trouvé.' });
        }
        res.json({ success: true, message: 'Temps supprimé.' });
    } catch (err) {
        next(err);
    }
};
