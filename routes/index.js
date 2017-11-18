var express = require('express');
var router = express.Router();
var mc = require('../controllers/mainController');

/* Login */
router.post('/login', mc.login);
router.get('/logout', mc.logout);
router.get('/loginstatus', mc.loginStatus);

/* Sign Up */
router.post('/signup', mc.signUp);

/* Address to Username */
router.get('/address/:address', mc.addressToUsername);

/* History */
router.post('/history/:username', mc.writeHistory);
router.get('/history/:username', mc.readHistory);

module.exports = router;
