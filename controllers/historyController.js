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
              value: req.body.value,
              reviewIndex: req.body.reviewIndex,
              action: req.body.action
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

  readHistory: function(req, res, next){
    ac.loginStatus(req, function(username){
      if (username){
        dc.getProfileByUsername(username, function(profile){
          if (profile._id == req.params.userId){
            dc.getHistoryById(req.params.userId, req.params.pageNum, function(history){
              var start = req.params.pageNum - 1;
              if (history.length > start * 5){
                if (history.length < start * 5 + 5){
                  console.log("here");
                  console.log(history.slice(start * 5, history.length));
                  res.json(history.slice(start * 5, history.length));
                } else {
                  res.json(history.slice(start * 5, start * 5 + 5));
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