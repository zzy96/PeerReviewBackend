var express = require('express');
var router = express.Router();

var userController = require('../controllers/userController');
var historyController = require('../controllers/historyController');
var utilityController = require('../controllers/utilityController');

/* userController */
router.get('/user', userController.checkLoginStatus);
router.post('/user/login', userController.login);
router.get('/user/logout', userController.logout);
router.post('/user/signup', userController.signUp);
// router.get('/user/signup', userController.signUpValidation);
// router.post('/user/password-reset', userController.resetRequest);
// router.post('/user/password-reset/verify', userController.resetVerify);
// router.post('/user/password-change', userController.changePassword);
/* historyController */
router.get('/history/user/:userId/:pageNum', historyController.readHistory);
router.post('/history/user/:userId', historyController.writeHistory);
// router.get('/history/tx/:txId', history.sendTxMultimedia);
// router.post('history/tx/:txId', history.receiveTxMultimedia);
/* utilityController */
router.get('/utility/address-to-username/:address', utilityController.addressToUsername)

module.exports = router;
