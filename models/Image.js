var mongoose = require('mongoose');
var Schema = mongoose.Schema;

module.exports = function(){
  var Image = new Schema({
    keyword: String,
    url: String
  }, {collection: 'Image'});
  mongoose.model('Image', Image);
}