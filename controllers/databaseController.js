var mongoose = require('mongoose');
require('../models/User.js')();
var User = mongoose.model("User");

module.exports = {

  newUser: function(data, cb){
    var user = new User(data);
    user.save(cb);
  },

  getUsername: function(address, cb){
    User.findOne({'address': address}, function(err, user){
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

  getAddress: function(username, cb){
    User.findOne({'username': username}, function(err, user){
      if (err){
        console.log(err);
        cb("");
      } else {
        if (user){
          cb(user.address);
        } else {
          cb("");
        }
      }
    });
  },

  getEncryptedKey: function(username, cb){
    User.findOne({'username': username}, function(err, user){
      if (err){
        console.log(err);
        cb("");
      } else {
        if (user){
          cb(JSON.parse(user.encryptedAccount));
        } else {
          cb("");
        }
      }
    });
  },

  getHashedPassword: function(username, cb){
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
  }

}