var dc = require('./databaseController');
var SHA3 = require('sha3');

function hashGenerator(input){
  var sha3 = new SHA3.SHA3Hash();
  sha3.update(input);
  return sha3.digest('hex')
}

module.exports = {

	login: function(req, cb){
		dc.getHashedPasswordByUsername(req.body.username, function(result){
			if (result != "" && result == hashGenerator(req.body.password)){
				// dc.getUsernameByEmail(req.body.email, function(username){
				// 	req.session.user = username;
				// 	cb(true);
				// })
				req.session.user = req.body.username;
				cb(true);
			} else {
				cb(false);
			}
		});
	},

	logout: function(req, cb){
		req.session.user = undefined;
		req.session.destroy();
		cb();
	},

	loginStatus: function(req, cb){
		if (req.session && req.session.user){
			cb(req.session.user);
		} else {
			cb("");
		}
	},

	loginCheck: function(req, res, next){
		if (req.session && req.session.user){
			next();
		} else {
			res.status(403).send('permission denied!');
		}
	}

}