const db = require('../config/database');

// GET /api/emplacements
exports.getAll = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT e.*, o.nom_Organisation 
            FROM Emplacement e
            LEFT JOIN Organisation o ON e.id_Organisation = o.id_Organisation
        `);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// GET /api/emplacements/:id
exports.getById = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT e.*, o.nom_Organisation 
            FROM Emplacement e
            LEFT JOIN Organisation o ON e.id_Organisation = o.id_Organisation
            WHERE e.id_Emplacement = ?
        `, [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Emplacement non trouvé.' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// GET /api/emplacements/organisation/:id — tous les emplacements d'une organisation
exports.getByOrganisation = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT e.*, o.nom_Organisation 
            FROM Emplacement e
            LEFT JOIN Organisation o ON e.id_Organisation = o.id_Organisation
            WHERE e.id_Organisation = ?
        `, [req.params.id]);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// GET /api/emplacements/channel/:channelId — emplacement par ID de salon Discord
exports.getByChannelId = async (req, res, next) => {
    try {
        const [rows] = await db.query(`
            SELECT e.*, o.nom_Organisation 
            FROM Emplacement e
            LEFT JOIN Organisation o ON e.id_Organisation = o.id_Organisation
            WHERE e.id_SalonDiscord = ?
        `, [req.params.channelId]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Aucun emplacement associé à ce salon Discord.' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// POST /api/emplacements
exports.create = async (req, res, next) => {
    try {
        const { nom_Emplacement, id_Organisation, id_SalonDiscord, pos_x, pos_y } = req.body;
        if (!nom_Emplacement) {
            return res.status(400).json({ success: false, message: 'Le champ nom_Emplacement est requis.' });
        }
        const [result] = await db.query(
            'INSERT INTO Emplacement (nom_Emplacement, id_Organisation, id_SalonDiscord, pos_x, pos_y) VALUES (?, ?, ?, ?, ?)',
            [nom_Emplacement, id_Organisation || null, id_SalonDiscord || null, pos_x ?? null, pos_y ?? null]
        );
        res.status(201).json({
            success: true,
            data: { id_Emplacement: result.insertId, nom_Emplacement, id_Organisation, id_SalonDiscord, pos_x, pos_y }
        });
    } catch (err) {
        next(err);
    }
};

// PUT /api/emplacements/:id
exports.update = async (req, res, next) => {
    try {
        const { nom_Emplacement, id_Organisation, id_SalonDiscord, pos_x, pos_y } = req.body;
        if (!nom_Emplacement) {
            return res.status(400).json({ success: false, message: 'Le champ nom_Emplacement est requis.' });
        }
        const [result] = await db.query(
            'UPDATE Emplacement SET nom_Emplacement = ?, id_Organisation = ?, id_SalonDiscord = ?, pos_x = ?, pos_y = ? WHERE id_Emplacement = ?',
            [nom_Emplacement, id_Organisation || null, id_SalonDiscord || null, pos_x ?? null, pos_y ?? null, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Emplacement non trouvé.' });
        }
        res.json({ success: true, data: { id_Emplacement: parseInt(req.params.id), nom_Emplacement, id_Organisation, id_SalonDiscord, pos_x, pos_y } });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/emplacements/:id
exports.delete = async (req, res, next) => {
    try {
        const [result] = await db.query('DELETE FROM Emplacement WHERE id_Emplacement = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Emplacement non trouvé.' });
        }
        res.json({ success: true, message: 'Emplacement supprimé.' });
    } catch (err) {
        next(err);
    }
};
