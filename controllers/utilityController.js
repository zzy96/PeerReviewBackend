var ac = require('./authenticationController');
var bc = require('./blockchainController');
var dc = require('./databaseController');

module.exports = {

  addressToUsername: function(req, res, next){
    console.log(req.params.address);
    dc.getUsernameByAddress(req.params.address, function(username){
      if (username){
        res.json({'username': username});
      } else {
        res.status(400).send("ethAddress not found");
      }
    })
  }

}