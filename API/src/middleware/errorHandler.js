/**
 * Middleware de gestion des erreurs global
 */
const errorHandler = (err, req, res, next) => {
    console.error('❌ Erreur:', err.message);
    console.error(err.stack);

    // Erreurs MySQL
    if (err.code === 'ER_DUP_ENTRY') {
        return res.status(409).json({
            success: false,
            message: 'Cette entrée existe déjà.'
        });
    }

    if (err.code === 'ER_NO_REFERENCED_ROW_2') {
        return res.status(400).json({
            success: false,
            message: 'Référence invalide : une clé étrangère ne correspond à aucune entrée existante.'
        });
    }

    res.status(err.status || 500).json({
        success: false,
        message: err.message || 'Erreur interne du serveur.'
    });
};

module.exports = errorHandler;
