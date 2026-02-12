const db = require('../config/database');

// GET /api/organisations
exports.getAll = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM Organisation');
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// GET /api/organisations/:id
exports.getById = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM Organisation WHERE id_Organisation = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Organisation non trouvée.' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// POST /api/organisations
exports.create = async (req, res, next) => {
    try {
        const { nom_Organisation, logo_url, couleur_Zone, zone_x, zone_y, zone_w, zone_h, zone_points } = req.body;
        if (!nom_Organisation) {
            return res.status(400).json({ success: false, message: 'Le champ nom_Organisation est requis.' });
        }
        const zonePointsStr = zone_points ? (typeof zone_points === 'string' ? zone_points : JSON.stringify(zone_points)) : null;
        const [result] = await db.query(
            'INSERT INTO Organisation (nom_Organisation, logo_url, couleur_Zone, zone_x, zone_y, zone_w, zone_h, zone_points) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            [nom_Organisation, logo_url || null, couleur_Zone || null, zone_x ?? null, zone_y ?? null, zone_w ?? null, zone_h ?? null, zonePointsStr]
        );
        res.status(201).json({
            success: true,
            data: { id_Organisation: result.insertId, nom_Organisation, logo_url, couleur_Zone, zone_x, zone_y, zone_w, zone_h, zone_points: zonePointsStr }
        });
    } catch (err) {
        next(err);
    }
};

// PUT /api/organisations/:id
exports.update = async (req, res, next) => {
    try {
        const { nom_Organisation, logo_url, couleur_Zone, zone_x, zone_y, zone_w, zone_h, zone_points } = req.body;
        if (!nom_Organisation) {
            return res.status(400).json({ success: false, message: 'Le champ nom_Organisation est requis.' });
        }
        const zonePointsStr = zone_points ? (typeof zone_points === 'string' ? zone_points : JSON.stringify(zone_points)) : null;
        const [result] = await db.query(
            `UPDATE Organisation SET 
                nom_Organisation = ?, logo_url = ?, couleur_Zone = ?,
                zone_x = ?, zone_y = ?, zone_w = ?, zone_h = ?, zone_points = ?
             WHERE id_Organisation = ?`,
            [nom_Organisation, logo_url || null, couleur_Zone || null, zone_x ?? null, zone_y ?? null, zone_w ?? null, zone_h ?? null, zonePointsStr, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Organisation non trouvée.' });
        }
        const [updated] = await db.query('SELECT * FROM Organisation WHERE id_Organisation = ?', [req.params.id]);
        res.json({ success: true, data: updated[0] });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/organisations/:id
exports.delete = async (req, res, next) => {
    try {
        const [result] = await db.query('DELETE FROM Organisation WHERE id_Organisation = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Organisation non trouvée.' });
        }
        res.json({ success: true, message: 'Organisation supprimée.' });
    } catch (err) {
        next(err);
    }
};
