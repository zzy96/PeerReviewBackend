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
router.post('/user/signup/validation', userController.signUpValidation);
router.get('/user/signup/verify/:username/:key', userController.emailVerification);
router.post('/user/password-reset', userController.resetRequest);
router.post('/user/password-reset/verify', userController.resetVerification);
router.post('/user/password-change', userController.changePassword);
/* historyController */
router.get('/history/user/:userId/:pageNum', historyController.readHistory);
router.post('/history/user/:userId', historyController.writeHistory);
// router.get('/history/tx/:txId', history.sendTxMultimedia);
// router.post('history/tx/:txId', history.receiveTxMultimedia);
/* utilityController */
router.get('/utility/address-to-username/:address', utilityController.addressToUsername);

router.get('/image/search/:keyword', utilityController.searchImage);

router.get('/test/receipt', function(req, res, next){
  res.render('receipt', { info: "Your email is verified. 0.08 Ether is sent to your account." });
})

router.post('/upload', function(req, res, next) {
  var file = req.files.logo;
  var filename = new Date().getTime() + file.name;
  file.mv('/root/PeerReviewBackend2.0/public/uploads/' + filename, function(err) {
    if (err) {
      res.status(500).send(err);
    } else {
      res.json({ url: 'http://188.166.190.168:3001/uploads/' + filename});
    }
  });
});

module.exports = router;
