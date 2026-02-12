const db = require('../config/database');

// GET /api/spawn-proies
exports.getAll = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT sp.*, p.nom_Proie, e.nom_Emplacement, t.nv_difficulte
            FROM SpawnProies sp
            JOIN Proie p ON sp.id_Proie = p.id_Proie
            JOIN Emplacement e ON sp.id_Emplacement = e.id_Emplacement
            JOIN Temps t ON sp.id_Temps = t.id_Temps
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// GET /api/spawn-proies/:id
exports.getById = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT sp.*, p.nom_Proie, e.nom_Emplacement, t.nv_difficulte
            FROM SpawnProies sp
            JOIN Proie p ON sp.id_Proie = p.id_Proie
            JOIN Emplacement e ON sp.id_Emplacement = e.id_Emplacement
            JOIN Temps t ON sp.id_Temps = t.id_Temps
            WHERE sp.id_Spawn = ?
        `, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Spawn non trouvé.' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// GET /api/spawn-proies/emplacement/:id — toutes les proies dans un emplacement
exports.getByEmplacement = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT sp.*, p.nom_Proie, p.pp_Proie, p.nv_Vitesse, p.nv_Endurance, p.nv_Rarete,
                   e.nom_Emplacement, t.nv_difficulte
            FROM SpawnProies sp
            JOIN Proie p ON sp.id_Proie = p.id_Proie
            JOIN Emplacement e ON sp.id_Emplacement = e.id_Emplacement
            JOIN Temps t ON sp.id_Temps = t.id_Temps
            WHERE sp.id_Emplacement = ? AND sp.nbr_Proie > 0
        `, [req.params.id]);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// POST /api/spawn-proies
exports.create = async (req, res, next) => {
    try {
        const { id_Proie, id_Emplacement, nbr_Proie, limite_Proie, id_Temps } = req.body;
        if (!id_Proie || !id_Emplacement || !id_Temps) {
            return res.status(400).json({
                success: false,
                message: 'Les champs id_Proie, id_Emplacement et id_Temps sont requis.'
            });
        }

        const [result] = await db.query(
            'INSERT INTO SpawnProies (id_Proie, id_Emplacement, nbr_Proie, limite_Proie, id_Temps) VALUES (?, ?, ?, ?, ?)',
            [id_Proie, id_Emplacement, nbr_Proie || 0, limite_Proie || 10, id_Temps]
        );

        res.status(201).json({
            success: true,
            data: { id_Spawn: result.insertId, id_Proie, id_Emplacement, nbr_Proie, limite_Proie, id_Temps }
        });
    } catch (err) {
        next(err);
    }
};

// PUT /api/spawn-proies/:id
exports.update = async (req, res, next) => {
    try {
        const { id_Proie, id_Emplacement, nbr_Proie, limite_Proie, id_Temps } = req.body;

        const [result] = await db.query(
            `UPDATE SpawnProies SET 
                id_Proie = COALESCE(?, id_Proie),
                id_Emplacement = COALESCE(?, id_Emplacement),
                nbr_Proie = COALESCE(?, nbr_Proie),
                limite_Proie = COALESCE(?, limite_Proie),
                id_Temps = COALESCE(?, id_Temps)
             WHERE id_Spawn = ?`,
            [id_Proie, id_Emplacement, nbr_Proie, limite_Proie, id_Temps, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Spawn non trouvé.' });
        }

        const [updated] = await db.query('SELECT * FROM SpawnProies WHERE id_Spawn = ?', [req.params.id]);
        res.json({ success: true, data: updated[0] });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/spawn-proies/:id
exports.delete = async (req, res, next) => {
    try {
        const [result] = await db.query('DELETE FROM SpawnProies WHERE id_Spawn = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Spawn non trouvé.' });
        }
        res.json({ success: true, message: 'Spawn supprimé.' });
    } catch (err) {
        next(err);
    }
};
