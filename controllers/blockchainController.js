var fs = require('fs');
var Web3 = require('web3');
var config = require('../config.json');

var web3 = new Web3(new Web3.providers.HttpProvider(config.SERVICE_PROVIDER));
web3.eth.accounts.wallet.add(config.ETH_ACCOUNT.privateKey);

module.exports = {
  topup: function(address, cb){
    // stop topup if balance is lower than 0.01 ether
    web3.eth.getBalance(config.ETH_ACCOUNT.address).then(balance => {
      if (balance >= 1e16){
        web3.eth.sendTransaction({
          from: config.ETH_ACCOUNT.address,
          to: address,
          value: config.INITIAL_AMOUNT,
          gas: 5000000,
          gasPrice: '10000000000'
        }, function(error, transactionHash){
          if (error){
            cb(false);
          } else {
            cb(true);
          }
        });
      } else {
        cb(false);
      }
    });
  },

  createAccount: function(){
    return web3.eth.accounts.create();
  },
  
  encryptAccount: function(privateKey, password){
    return web3.eth.accounts.encrypt(privateKey, password);
  }
}
