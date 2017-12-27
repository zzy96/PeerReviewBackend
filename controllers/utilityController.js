var ac = require('./authenticationController');
var bc = require('./blockchainController');
var dc = require('./databaseController');
var emailConfig = {
  api_key:"key-07a57830eb9e1d7229141a8b48555499",
  DOMAIN:"mg.ntuweiqisociety.com"
}
const GoogleImages = require('google-images');
const client = new GoogleImages('013844413201672951539:mks7ril9cvg', 'AIzaSyBYTi2BsX5YoQf02uMyPF9TvrzdUS2K20U');

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
    var api_key = emailConfig.api_key;
    var DOMAIN = emailConfig.DOMAIN;
    var mailgun = require('mailgun-js')({apiKey: api_key, domain: DOMAIN});

    var data = {
      from: 'Nanyang Review Chain <dReview@ntuweiqisociety.com>',
      to: email,
      subject: 'Email verification from Nanyang Review Chain',
      text: code
    };

    mailgun.messages().send(data, function (error, body) {
      console.log(body);
    });
  },

  searchImage: function(req, res, next){
    dc.getImage(req.params.keyword, function(url){
      if (url){
        res.json({'url': url});
      } else {
        client.search(req.params.keyword).then(images => {
          console.log(images[0]);
          dc.newImage({'keyword':req.params.keyword, 'url':images[0].url}, function(err){
            console.log(err);
          });
          res.json({'url': images[0].url})
        })
      }
    })
  }

}