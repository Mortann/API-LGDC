const db = require('../config/database');

// GET /api/messages
exports.getAll = async (req, res, next) => {
    try {
        const { type } = req.query;
        let query = `SELECT m.*, GROUP_CONCAT(p.nom_Proie SEPARATOR ', ') AS proies_liees,
                      GROUP_CONCAT(p.id_Proie) AS proies_ids
                      FROM Message m
                      LEFT JOIN ListMessage lm ON m.id_Message = lm.id_Message
                      LEFT JOIN Proie p ON lm.id_Proie = p.id_Proie`;
        const params = [];

        if (type) {
            query += ' WHERE m.type_Message = ?';
            params.push(type.toUpperCase());
        }

        query += ' GROUP BY m.id_Message';

        const [rows] = await db.query(query, params);
        res.json({ success: true, data: rows });
    } catch (err) {
        next(err);
    }
};

// GET /api/messages/:id
exports.getById = async (req, res, next) => {
    try {
        const [rows] = await db.query('SELECT * FROM Message WHERE id_Message = ?', [req.params.id]);
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Message non trouvé.' });
        }
        res.json({ success: true, data: rows[0] });
    } catch (err) {
        next(err);
    }
};

// POST /api/messages
exports.create = async (req, res, next) => {
    try {
        const { contenu_Message, type_Message } = req.body;
        if (!contenu_Message || !type_Message) {
            return res.status(400).json({
                success: false,
                message: 'Les champs contenu_Message et type_Message sont requis.'
            });
        }

        const validTypes = ['RECHERCHE', 'CAPTURE', 'ECHEC'];
        if (!validTypes.includes(type_Message.toUpperCase())) {
            return res.status(400).json({
                success: false,
                message: `type_Message doit être l'un des suivants : ${validTypes.join(', ')}`
            });
        }

        const [result] = await db.query(
            'INSERT INTO Message (contenu_Message, type_Message) VALUES (?, ?)',
            [contenu_Message, type_Message.toUpperCase()]
        );

        res.status(201).json({
            success: true,
            data: { id_Message: result.insertId, contenu_Message, type_Message: type_Message.toUpperCase() }
        });
    } catch (err) {
        next(err);
    }
};

// PUT /api/messages/:id
exports.update = async (req, res, next) => {
    try {
        const { contenu_Message, type_Message } = req.body;

        if (type_Message) {
            const validTypes = ['RECHERCHE', 'CAPTURE', 'ECHEC'];
            if (!validTypes.includes(type_Message.toUpperCase())) {
                return res.status(400).json({
                    success: false,
                    message: `type_Message doit être l'un des suivants : ${validTypes.join(', ')}`
                });
            }
        }

        const [result] = await db.query(
            `UPDATE Message SET 
                contenu_Message = COALESCE(?, contenu_Message),
                type_Message = COALESCE(?, type_Message)
             WHERE id_Message = ?`,
            [contenu_Message, type_Message ? type_Message.toUpperCase() : null, req.params.id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Message non trouvé.' });
        }

        const [updated] = await db.query('SELECT * FROM Message WHERE id_Message = ?', [req.params.id]);
        res.json({ success: true, data: updated[0] });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/messages/:id
exports.delete = async (req, res, next) => {
    try {
        const [result] = await db.query('DELETE FROM Message WHERE id_Message = ?', [req.params.id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Message non trouvé.' });
        }
        res.json({ success: true, message: 'Message supprimé.' });
    } catch (err) {
        next(err);
    }
};

// POST /api/messages/:id/proie/:proieId — lier un message à une proie
exports.linkToProie = async (req, res, next) => {
    try {
        await db.query(
            'INSERT INTO ListMessage (id_Proie, id_Message) VALUES (?, ?)',
            [req.params.proieId, req.params.id]
        );
        res.status(201).json({ success: true, message: 'Message lié à la proie.' });
    } catch (err) {
        next(err);
    }
};

// DELETE /api/messages/:id/proie/:proieId — délier un message d'une proie
exports.unlinkFromProie = async (req, res, next) => {
    try {
        const [result] = await db.query(
            'DELETE FROM ListMessage WHERE id_Proie = ? AND id_Message = ?',
            [req.params.proieId, req.params.id]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({ success: false, message: 'Lien non trouvé.' });
        }
        res.json({ success: true, message: 'Lien supprimé.' });
    } catch (err) {
        next(err);
    }
};
