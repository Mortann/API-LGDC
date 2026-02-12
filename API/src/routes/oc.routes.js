const router = require('express').Router();
const ctrl = require('../controllers/oc.controller');

router.get('/', ctrl.getAll);
router.put('/reset-all-daily', ctrl.resetAllDaily);
router.get('/:id', ctrl.getById);
router.get('/organisation/:id', ctrl.getByOrganisation);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.put('/:id/deplacement', ctrl.deplacer);
router.put('/:id/reset-daily', ctrl.resetDaily);
router.delete('/:id', ctrl.delete);

module.exports = router;
