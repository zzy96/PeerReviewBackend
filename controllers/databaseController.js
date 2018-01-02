var mongoose = require('mongoose');
require('../models/User.js')();
var User = mongoose.model("User");
require('../models/Image.js')();
var Image = mongoose.model("Image");
var bc = require('./blockchainController');

module.exports = {

  /*
  newUser: function(data, cb);
  getUsernameByAddress: function(address, cb);
  getAddressByUsername: function(username, cb);
  getProfileByUsername: function(username, cb);
  getHashedPasswordByUsername: function(username, cb);
  getHistoryById: function(id, pageNum, cb);
  addHistoryById: function(id, record, cb);
  usernameValidation: function(username, cb);
  emailValidation: function(email, cb);
  getResetByEmail: function(email, cb);
  updateResetByEmail: function(email, reset, cb);
  updatePasswordByEmail: function(email, hashedPassword, cb);
  getEmailVerificationByUsername: function(username, cb);
  updateEmailByUsername: function(username, cb);
  */

  newImage: function(data, cb){
    var image = new Image(data);
    image.save(cb)
  },

  getImage: function(keyword, cb){
    Image.findOne({'keyword': keyword}, function(err, image){
      if (err){
        console.log(err);
        cb("");
      } else {
        if (image){
          cb(image.url);
        } else {
          cb("");
        }
      }
    });
  },

  newUser: function(data, cb){
    var user = new User(data);
    user.save(cb);
  },

  // getUsernameByEmail: function(email, cb){
  //   User.findOne({'email': email}, function(err, user){
  //     if (err){
  //       console.log(err);
  //       cb("");
  //     } else {
  //       if (user){
  //         cb(user.username);
  //       } else {
  //         cb("");
  //       }
  //     }
  //   });
  // },

  getUsernameByAddress: function(address, cb){
    User.findOne({'ethAddress': address}, function(err, user){
      if (err){
        console.log(err);
        cb("");
      } else {
        if (user){
          cb(user.username);
        } else {
          cb("");
        }
      }
    });
  },

  getAddressByUsername: function(username, cb){
    User.findOne({'username': username}, function(err, user){
      if (err){
        console.log(err);
        cb("");
      } else {
        if (user){
          cb(user.ethAddress);
        } else {
          cb("");
        }
      }
    });
  },

  getProfileByUsername: function(username, cb){
    User.findOne({'username': username}, function(err, user){
      if (err){
        console.log(err);
        cb("");
      } else {
        if (user){
          user.txHistory = undefined;
          user.emailVerification = undefined;
          user.reset = undefined;
          cb(user);
        } else {
          cb("");
        }
      }
    });
  },

  getHashedPasswordByUsername: function(username, cb){
    User.findOne({'username': username}, function(err, user){
      if (err){
        console.log(err);
        cb("");
      } else {
        if (user){
          cb(user.hashedPassword);
        } else {
          cb("");
        }
      }
    });
  },

  getHistoryById: function(id, pageNum, cb){
    User.findOne({'_id': id}, function(err, user){
      if (err){
        console.log(err);
        cb([]);
      } else {
        if (user){
          cb(user.txHistory);
        } else {
          cb([]);
        }
      }
    });
  },

  addHistoryById: function(id, record, cb){
    User.findOne({'_id': id}, function(err, user){
      if (err){
        console.log(err);
        cb(false);
      } else {
        if (user){
          user.txHistory.unshift(record);
          user.save(function(err, user){
            if (err) {
              console.log(err);
              cb(false);
            } else {
              cb(true);
            }
          });
        } else {
          cb(false);
        }
      }
    });
  },

  usernameValidation: function(username, cb){
    User.findOne({'username': username}, function(err, user){
      if (err){
        console.log(err);
        cb(false);
      } else {
        if (user){
          cb(false);
        } else {
          cb(true);
        }
      }
    });
  },

  emailValidation: function(email, cb){
    User.findOne({'email': email}, function(err, user){
      if (err){
        console.log(err);
        cb(false);
      } else {
        if (user){
          cb(false);
        } else {
          cb(true);
        }
      }
    });
  },

  getResetByEmail: function(email, cb){
    User.findOne({'email': email}, function(err, user){
      if (err){
        console.log(err);
        cb({});
      } else {
        if (user){
          cb(user.reset);
        } else {
          cb({});
        }
      }
    });
  },

  updateResetByEmail: function(email, reset, cb){
    User.findOne({'email': email}, function(err, user){
      if (err){
        console.log(err);
        cb(false);
      } else {
        if (user){
          user.reset = reset;
          user.save(function(err, user){
            if (err) {
              console.log(err);
              cb(false);
            } else {
              cb(true);
            }
          });
        } else {
          cb(false);
        }
      }
    });
  },

  updatePasswordByEmail: function(email, hashedPassword, cb){
    User.findOne({'email': email}, function(err, user){
      if (err){
        console.log(err);
        cb(false);
      } else {
        if (user){
          user.encryptedAccount = JSON.stringify(bc.encryptAccount(bc.decryptAccount(user.encryptedAccount, user.hashedPassword), hashedPassword));
          user.hashedPassword = hashedPassword;
          user.reset = {
            status: false,
          };
          user.save(function(err, user){
            if (err) {
              console.log(err);
              cb(false);
            } else {
              cb(true);
            }
          });
        } else {
          cb(false);
        }
      }
    });
  },

  getEmailVerificationByUsername: function(username, cb){
    User.findOne({'username': username}, function(err, user){
      if (err){
        console.log(err);
        cb("");
      } else {
        if (user){
          cb(user.emailVerification);
        } else {
          cb("");
        }
      }
    });
  },

  updateEmailByUsername: function(username, cb){
    User.findOne({'username': username}, function(err, user){
      if (err){
        console.log(err);
        cb(false);
      } else {
        if (user){
          User.findOne({'email': user.unverifiedEmail}, function(err, userCheck){
            if (err){
              console.log(err);
              cb(false);
            } else {
              if (userCheck){
                cb(false);
              } else {
                user.email = user.unverifiedEmail;
                user.isActivated = true;
                user.save(function(err, user){
                  if (err) {
                    console.log(err);
                    cb(false);
                  } else {
                    cb(true);
                  }
                });
              }
            }
          });
        } else {
          cb(false);
        }
      }
    });
  }

}