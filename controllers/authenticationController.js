var dc = require('./databaseController');

module.exports = {

	login: function(req, cb){
		console.log(req.body); // for debugging
		dc.getHashedPassword(req.body.username, function(result){
			if (result == req.body.hashedPassword && req.body.hashedPassword != ""){
				req.session.user = req.body.username;
				console.log(req.session);
				console.log(req.session.id);
				// req.session.save(function (err) {
				//   if (err) {
				//   	console.log(err);
				//   	cb(false);
				//   } else {
				//   	cb(true);
				//   }
				// });
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
		console.log(req.session);
		console.log(req.session.id);
		if (req.session && req.session.user){
			cb(req.session.user);
		} else {
			cb("");
		}
	}

}