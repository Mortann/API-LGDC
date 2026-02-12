const router = require('express').Router();
const ctrl = require('../controllers/spawnProies.controller');

router.get('/', ctrl.getAll);
router.get('/:id', ctrl.getById);
router.get('/emplacement/:id', ctrl.getByEmplacement);
router.post('/', ctrl.create);
router.put('/:id', ctrl.update);
router.delete('/:id', ctrl.delete);

module.exports = router;
