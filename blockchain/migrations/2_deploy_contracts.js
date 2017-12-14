var StoreRegistry = artifacts.require("./StoreRegistry.sol");

module.exports = function(deployer) {
  deployer.deploy(StoreRegistry);
};
