const router = require('express').Router();
const ctrl = require('../controllers/stats.controller');

router.get('/', ctrl.getAll);
router.get('/leaderboard', ctrl.leaderboard);
router.get('/discord/:discordId', ctrl.getByDiscordId);
router.get('/captures/:discordId', ctrl.getCaptures);
router.post('/init', ctrl.init);
router.post('/capture', ctrl.addCapture);
router.put('/increment', ctrl.increment);
router.put('/set', ctrl.set);
router.put('/reset-daily', ctrl.resetDaily);

module.exports = router;
