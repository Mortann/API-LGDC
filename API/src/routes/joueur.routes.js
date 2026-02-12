const router = require('express').Router();
const ctrl = require('../controllers/joueur.controller');

router.get('/', ctrl.getAll);
router.get('/discord/:discordId', ctrl.getByDiscordId);
router.get('/discord/:discordId/ocs', ctrl.getOCsByDiscordId);
router.get('/:id', ctrl.getById);
router.get('/:id/ocs', ctrl.getOCs);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.delete);

module.exports = router;
