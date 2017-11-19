var ac = require('./authenticationController');
var bc = require('./blockchainController');
var dc = require('./databaseController');

module.exports = {

  login: function(req, res, next){
    ac.login(req, function(flag){
      if (flag){
        res.json({ status: 'success', action: "login"});
      } else {
        res.json({ status: 'fail', action: "login"});
      }
    });
  },

  logout: function(req, res, next){
    ac.logout(req, function(){
      res.json({ status: 'success', action: "logout"});
    });
  },

  loginStatus: function(req, res, next){
    // username == "" as signal for not login
    ac.loginStatus(req, function(username){
      if (username == ""){
        res.json({ username: "", action: "login status"});
      } else {
        var response = {
          username: username
        }
        dc.getAddress(username, function(address){
          response.address = address;
          dc.getEncryptedAccount(username, function(encryptedAccount){
            response.encryptedAccount = encryptedAccount;
            res.json(response);
          });
        });
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
        res.json({ status: 'fail', action: "sign up"});
      } else {
        ac.login(req, function(result){
          if (result){
            console.log("user: " + user.username + " successfully sign up!");
            bc.topup(user.address, function(flag){
              if (flag){
                res.json({ status: 'success', topup: 'success', action: "sign up"});
              } else {
                res.json({ status: 'success', topup: 'fail', action: "sign up"});
              }
            });
          }
        });
      }
    });

  },

  addressToUsername: function(req, res, next){
    console.log(req.params.address);
    dc.getUsername(req.params.address, function(username){
      res.json({'username': username, action: "address to username"});
    })
  },

  writeHistory: function(req, res, next){
    var transaction = {
      hash: req.body.hash,
      balance: req.body.balance,
      type: req.body.type
    };
    dc.addHistory(req.params.username, transaction, function(flag){
      if (flag){
        res.json({ status: 'success', action: "add history"});
      } else {
        res.json({ status: 'fail', action: "add history"});
      }
    });
  },

  readHistory: function(req, res, next){
    dc.getHistory(req.params.username, function(history){
      res.json(history);
    });
  }

}
