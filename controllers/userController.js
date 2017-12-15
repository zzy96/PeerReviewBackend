var ac = require('./authenticationController');
var bc = require('./blockchainController');
var dc = require('./databaseController');

module.exports = {

  login: function(req, res, next){
    ac.login(req, function(flag){
      if (flag){
        res.status(200).send('logged in');
      } else {
        res.status(403).send('Wrong authentication information');
      }
    });
  },

  logout: function(req, res, next){
    ac.logout(req, function(){
      res.status(200).send('successful operation');
    });
  },

  checkLoginStatus: function(req, res, next){
    // profile.username == "" as signal for not login
    ac.loginStatus(req, function(username){
      if (username == ""){
        res.json({ status: "fail", profile: {}});
      } else {
        dc.getProfileByUsername(username, function(profile){
          res.json(profile);
        });
      }
    });
  },

  signUp: function(req, res, next){
    var user = {};
    user.isActivated = false;
    user.email = req.body.email;
    user.username = req.body.username;
    user.hashedPassword = req.body.hashedPassword;
    var account = bc.createAccount();
    user.ethAddress = account.address;
    user.encryptedAccount = JSON.stringify(bc.encryptAccount(account.privateKey, user.hashedPassword));
    user.totalTx = 0;
    user.txHistory = [];

    dc.newUser(user, function(err){
      if (err){
        console.log(err);
        res.status(500).send(err);
      } else {
        ac.login(req, function(result){
          if (result){
            console.log("user: " + user.username + " successfully sign up!");
            bc.topup(user.ethAddress, function(flag){
              if (flag){
                res.status(200).send("Top up success")
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

  signUpValidation: function(req, res, next){
    dc.usernameValidation(req.body.username, function(username_result){
      dc.emailValidation(req.body.email, function(email_result){
        if (username_result && email_result){
          res.json({'username_status': true, 'email_status': true});
        } else if (!username_result && email_result){
          res.json({'username_status': false, 'email_status': true});
        } else if (username_result && !email_result){
          res.json({'username_status': true, 'email_status': false});
        } else{
          res.json({'username_status': false, 'email_status': false});
        }
      });
    });
  },

  resetRequest: function(req, res, next){

  },

  resetVerify: function(req, res, next){

  },

  changePassword: function(req, res, next){

  }

}
