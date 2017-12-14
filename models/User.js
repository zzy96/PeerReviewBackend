var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = function(){
  var User = new Schema({
    isActivated: Boolean,
    email: String,
    username: String,
    hashedPassword: String,
    ethAddress: String,
    encryptedAccount: String,
    totalTx: Number,
    txHistory: Array
  }, {collection: 'User'});
  mongoose.model('User', User);
}