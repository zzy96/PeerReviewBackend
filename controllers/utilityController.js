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
  },

  sendVerificationEmail: function(email, code){
    var mailgun = require("mailgun-js");
    var api_key = 'key-07a57830eb9e1d7229141a8b48555499';
    var DOMAIN = 'sandboxe347bf4ee8e44ea8b8f669e6a122c71a.mailgun.org';
    var mailgun = require('mailgun-js')({apiKey: api_key, domain: DOMAIN});

    var data = {
      from: 'admin <PeerReview@sandboxe347bf4ee8e44ea8b8f669e6a122c71a.mailgun.org>',
      to: email,
      subject: 'Email verification from Nanyang Review Chain',
      text: code
    };

    mailgun.messages().send(data, function (error, body) {
      console.log(body);
    });
  }

}