var mongoose = require('mongoose');
require('../models/User.js')();
var User = mongoose.model("User");

module.exports = {

  /*
  newUser: function(data, cb);
  getUsernameByAddress: function(address, cb);
  getProfileByUsername: function(username, cb);
  getHashedPasswordByUsername: function(username, cb);
  getHistoryById: function(id, pageNum, cb);
  addHistoryById: function(id, record, cb);
  */

  newUser: function(data, cb){
    var user = new User(data);
    user.save(cb);
  },

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

  getProfileByUsername: function(username, cb){
    User.findOne({'username': username}, function(err, user){
      if (err){
        console.log(err);
        cb("");
      } else {
        if (user){
          delete user.txHistory;
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
          user.txHistory.push(record);
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
  }

}