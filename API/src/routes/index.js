const router = require('express').Router();

// Auth routes (no middleware required)
router.use('/auth', require('./auth.routes'));

// Import de toutes les routes
router.use('/organisations', require('./organisation.routes'));
router.use('/emplacements', require('./emplacement.routes'));
router.use('/ocs', require('./oc.routes'));
router.use('/pnjs', require('./pnj.routes'));
router.use('/joueurs', require('./joueur.routes'));
router.use('/proies', require('./proie.routes'));
router.use('/temps', require('./temps.routes'));
router.use('/spawn-proies', require('./spawnProies.routes'));
router.use('/messages', require('./message.routes'));
router.use('/chasse', require('./chasse.routes'));
router.use('/stats', require('./stats.routes'));
router.use('/discord', require('./discord.routes'));

module.exports = router;
