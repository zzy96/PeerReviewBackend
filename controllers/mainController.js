var ac = require('./authenticationController');
var bc = require('./blockchainController');
var dc = require('./databaseController');

module.exports = {

  login: function(req, res, next){
    ac.login(req, function(result){
      if (result){
        res.json({ status: 'success' });
      } else {
        res.json({ status: 'fail' });
      }
    });
  },

  logout: function(req, res, next){
    ac.logout(req, function(){
      res.json({ status: 'success' });
    });
  },

  loginStatus: function(req, res, next){
    // username == "" as signal for not login
    ac.loginStatus(req, function(username){
      if (username == ""){
        res.json({ username: "" });
      } else {
        res.json({
          username: username,
          address: dc.getAddress(username),
          encryptedAccount: dc.getEncryptedAccount(username),
        })
      }
    });
  },

  signUp: function(req, res, next){
    var user = {};
    user.username = req.body.username;
    user.hashedPassword = req.body.hashedPassword;
    var account = bc.createAccount();
    user.address = account.address;
    user.encryptedAccount = JSON.stringify(bc.encryptAccount(account.privateKey, user.hashedPassword));
    user.transactionHistory = [];
    
    dc.newUser(user, function(err){
      if (err){
        console.log(err);
        res.json({ status: 'fail' });
      } else {
        bc.topup(user.address, function(flag){
          if (flag){
            res.json({ status: 'success', topup: 'success'});
          } else {
            res.json({ status: 'success', topup: 'fail'});
          }
        });
      }
    });

  },

  addressToUsername: function(req, res, next){
    dc.getUsername(address, function(username){
      res.json({'username': username});
    })
  },

  writeHistory: function(req, res, next){

  },

  readHistory: function(req, res, next){

  }

}
