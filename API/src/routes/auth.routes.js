const router = require('express').Router();
const authCtrl = require('../controllers/auth.controller');

router.get('/login', authCtrl.login);
router.post('/callback', authCtrl.callback);
router.get('/me', authCtrl.me);

module.exports = router;
