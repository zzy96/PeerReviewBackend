var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = function(){
  var User = new Schema({
    username: String,
    hashedPassword: String,
    address: String,
    encryptedAccount: String,
    transactionHistory: Array
  }, {collection: 'User'});
  mongoose.model('User',User);
}