const router = require('express').Router();
const ctrl = require('../controllers/chasse.controller');

// Tenter une chasse (action principale)
router.post('/tenter', ctrl.tenterChasse);

// Voir les proies disponibles dans un emplacement
router.get('/proies-disponibles/:idEmplacement', ctrl.getProiesDisponibles);

// Stats de chasse d'un OC
router.get('/stats/:idOC', ctrl.getStatsChasse);

// Simuler une chasse (preview sans effet)
router.get('/simuler', ctrl.simuler);

module.exports = router;
