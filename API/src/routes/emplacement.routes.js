const router = require('express').Router();
const ctrl = require('../controllers/emplacement.controller');

router.get('/', ctrl.getAll);
router.get('/channel/:channelId', ctrl.getByChannelId);
router.get('/organisation/:id', ctrl.getByOrganisation);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.delete);

module.exports = router;
