const router = require('express').Router();
const ctrl = require('../controllers/message.controller');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.delete);
router.post('/:id/proie/:proieId', ctrl.linkToProie);
router.delete('/:id/proie/:proieId', ctrl.unlinkFromProie);

module.exports = router;
