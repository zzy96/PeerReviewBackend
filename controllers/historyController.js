var ac = require('./authenticationController');
var bc = require('./blockchainController');
var dc = require('./databaseController');

module.exports = {

  writeHistory: function(req, res, next){
    ac.loginStatus(req, function(username){
      if (username){
        dc.getProfileByUsername(username, function(profile){
          if (profile._id == req.params.userId){
            var transaction = {
              txHash: req.body.txHash,
              storeName: req.body.storeName,
              value: req.body.value,
              isPositive: req.body.isPositive,
              originalReviewer: req.body.originalReviewer,
              action: req.body.action,
              status: req.body.status,
              timestamp: new Date().getTime()
            };
            dc.addHistoryById(req.params.userId, transaction, function(flag){
              if (flag){
                res.status(200).send("new transaction saved");
              } else {
                res.status(400).send("operation failed");
              }
            });
          } else {
            res.status(400).send("wrong user id");
          }
        });
      } else {
        res.status(403).send("permission denied");
      }
    });
  },

  writeOthersHistory: function(req, res, next){
    ac.loginStatus(req, function(username){
      if (username){
        dc.getUsernameByAddress(req.params.address, function(username){
          dc.getProfileByUsername(username, function(profile){
            var transaction = {
              txHash: req.body.txHash,
              storeName: req.body.storeName,
              value: req.body.value,
              isPositive: req.body.isPositive,
              originalReviewer: req.body.originalReviewer,
              action: req.body.action,
              status: req.body.status,
              timestamp: new Date().getTime()
            };
            dc.addHistoryById(profile._id, transaction, function(flag){
              if (flag){
                res.status(200).send("new transaction saved");
              } else {
                res.status(400).send("operation failed");
              }
            });
          });
        });
      } else {
        res.status(403).send("permission denied");
      }
    });
  },

  readHistory: function(req, res, next){
    ac.loginStatus(req, function(username){
      if (username){
        dc.getProfileByUsername(username, function(profile){
          if (profile._id == req.params.userId){
            dc.getHistoryById(req.params.userId, req.params.pageNum, function(history){
              var start = req.params.pageNum - 1;
              if (history.length > start * 5){
                if (history.length < start * 5 + 5){
                  res.json({total: history.length, currentPage: req.params.pageNum, txHistory: history.slice(start * 5, history.length)});
                } else {
                  res.json({total: history.length, currentPage: req.params.pageNum, txHistory: history.slice(start * 5, start * 5 + 5)});
                }
              } else {
                res.status(400).send("no transaction record");
              }
            });
          } else {
            res.status(403).send("permission denied");
          }
        });
      } else {
        res.status(403).send("permission denied");
      }
      
    });
  }
}