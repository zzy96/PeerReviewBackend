var StoreRegistry = artifacts.require("./StoreRegistry.sol");
var Store = artifacts.require("./Store.sol");
var Escrow = artifacts.require("./Escrow.sol");

contract('StoreRegistry', accounts => {
	it('should instantiate a correct Escrow contract', () => {
		let registry_inst;
		let escrow_inst;
		return StoreRegistry.deployed().then(instance => {
			registry_inst = instance;
			return instance.escrowAddress();
		}).then(escrowAddress => {
			assert.notEqual(escrowAddress, '0x0', 'Escrow contract address shouldn\'t be zero');
			return Escrow.at(escrowAddress);
		}).then(instance => {
			escrow_inst = instance;
			return escrow_inst.storeRegistry();
		}).then(storeRegistryAddress => {
			assert.equal(registry_inst.address, storeRegistryAddress,'Escrow contract should have correct registry contract address');
		});
	});

	it('addStore and getStoreAddress function should work', ()=>{
		let registry_inst;
		let escrow_inst;
		return StoreRegistry.deployed().then(instance =>{
			registry_inst = instance;
			return instance.addStore('testStore');
		}).then(receipt =>{
			assert.equal(receipt.logs[0].event, 'LogStoreCreated', 'store created log should be created')
			return registry_inst.getStoreAddress('testStore');
		}).then(address =>{
			assert.notEqual(address,0x0, 'new store should be added');
		});
	});

	it('storeExist function should work', () =>{
		let registry_inst;
		return StoreRegistry.deployed().then(instance =>{
			registry_inst = instance;
			return instance.storeExist('random');
		}).then(result =>{
			assert.equal(result, false, 'store haven\'t been created yet');
			return registry_inst.addStore('testing');
		}).then(() => {
			return registry_inst.storeExist('testing');
		}).then(result =>{
			console.log(result);
			assert.equal(result, true, 'store should exist');
		});
	});

})