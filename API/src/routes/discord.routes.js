const router = require('express').Router();
const ctrl = require('../controllers/discord.controller');

router.get('/status', ctrl.getStatus);
router.get('/channels', ctrl.getChannels);
router.get('/members', ctrl.getMembers);
router.get('/members/:id', ctrl.getMember);
router.get('/roles', ctrl.getRoles);
router.post('/send', ctrl.sendMessage);
router.post('/roles/:userId/:roleId', ctrl.addRole);
router.delete('/roles/:userId/:roleId', ctrl.removeRole);

module.exports = router;
