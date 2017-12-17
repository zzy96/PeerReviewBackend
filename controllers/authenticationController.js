var dc = require('./databaseController');
var SHA3 = require('sha3');
var sha3 = new SHA3.SHA3Hash();

module.exports = {

	login: function(req, cb){
		console.log(req.body); // for debugging
		dc.getHashedPasswordByUsername(req.body.username, function(result){
			sha3.update(req.body.password);
			console.log(result);
			console.log(sha3.digest('hex'));
			if (result != "" && result == sha3.digest('hex')){
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