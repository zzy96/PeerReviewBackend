var ac = require('./authenticationController');
var bc = require('./blockchainController');
var dc = require('./databaseController');
var uc = require('../controllers/utilityController');
var SHA3 = require('sha3');

module.exports = {

  login: function(req, res, next){
    ac.login(req, function(flag){
      if (flag){
        res.status(200).send('logged in');
      } else {
        res.status(403).send('wrong authentication information');
      }
    });
  },

  logout: function(req, res, next){
    ac.logout(req, function(){
      res.status(200).send('logout success');
    });
  },

  checkLoginStatus: function(req, res, next){
    // profile.username == "" as signal for not login
    ac.loginStatus(req, function(username){
      if (username == ""){
        res.json({ status: "fail", profile: {}});
      } else {
        dc.getProfileByUsername(username, function(profile){
          res.json({ 'status': "success", 'profile': profile});
        });
      }
    });
  },

  signUp: function(req, res, next){
    var user = {};
    user.isActivated = false;
    user.unverifiedEmail = req.body.email;
    // store verification code temporarily
    user.emailVerification = Math.floor(Math.random() * 10000000000);
    user.email = "";
    user.username = req.body.username;
    var sha3 = new SHA3.SHA3Hash();
    sha3.update(req.body.password);
    user.hashedPassword = sha3.digest('hex');
    var account = bc.createAccount();
    user.ethAddress = account.address;
    user.encryptedAccount = JSON.stringify(bc.encryptAccount(account.privateKey, user.hashedPassword));
    user.totalTx = 0;
    user.txHistory = [];
    user.reset = {
      status: false,
    };

    // username uniqueness check in database index
    dc.newUser(user, function(err){
      if (err){
        console.log(err);
        res.status(500).send(err);
      } else {
        ac.login(req, function(result){
          uc.sendVerificationEmail(user.unverifiedEmail, "http://188.166.190.168:3001/user/signup/verify/" + user.username + "/" + user.emailVerification);
          if (result){
            res.status(200).send("account created");
          } else {
            res.status(200).send("account created but login failed");
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

  emailVerification: function(req, res, next){
    dc.getEmailVerificationByUsername(req.params.username, function(key){
      if (key && key == req.params.key){
        dc.updateEmailByUsername(req.params.username, function(flag){
          if (flag){
            dc.getAddressByUsername(req.params.username, function(address){
              bc.topup(address, function(flag){
                if (flag){
                  res.status(200).send("email verified. Top up success");
                } else {
                  res.status(200).send("email verified. Top up fail");
                }
              });
            });
          } else {
            res.status(500).send("email activation failed");
          }
        });
      } else {
        res.status(400).send("email verification failed");
      }
    });
  },

  resetRequest: function(req, res, next){
    dc.getResetByEmail(req.body.email, function(reset){
      if (reset){
        reset = {
          status: true,
          verified: false,
          verificationCode: Math.floor(1000000 + (Math.random() * 10000000)).toString().slice(0,6),
          timestamp: new Date().getTime()
        };
        dc.updateResetByEmail(req.body.email, reset, function(flag){
          if (flag){
            uc.sendVerificationEmail(req.body.email, reset.verificationCode);
            res.status(200).send("waiting for verification");
          } else {
            res.status(500).send("reset request fail");
          }
        });
      } else {
        res.status(400).send("email doesn't exist");
      }
    });
  },

  resetVerification: function(req, res, next){
    dc.getResetByEmail(req.body.email, function(reset){
      console.log((new Date().getTime() - reset.timestamp) < 30000);
      if (reset && reset.status == true && req.body.verificationCode == reset.verificationCode && (new Date().getTime() - reset.timestamp) < 300000){
        reset = {
          status: true,
          verified: true,
          timestamp: new Date().getTime()
        };
        dc.updateResetByEmail(req.body.email, reset, function(flag){
          if (flag){
            res.status(200).send("verification success");
          } else {
            res.status(400).send("verification fail because of internal server error");
          }
        });
      } else {
        res.status(403).send("verification fail or timeout");
      }
    });
  },

  changePassword: function(req, res, next){
    dc.getResetByEmail(req.body.email, function(reset){
      if (reset && reset.status && reset.verified && (new Date().getTime() - reset.timestamp) < 300000){
        var sha3 = new SHA3.SHA3Hash();
        sha3.update(req.body.newPassword);
        dc.updatePasswordByEmail(req.body.email, sha3.digest('hex'), function(flag){
          if (flag){
            res.status(200).send("password update success");
          } else {
            res.status(500).send("password update fail");
          }
        });
      } else {
        res.status(403).send("permission denied");
      }
    });
  }

}
