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
			assert.equal(result, true, 'store should exist');
		});
	});
});

contract('Store', accounts =>{
	it('constructor should initialize correct placeID and escrowAddress', ()=>{
		let registry_inst;
		let escrow_inst;
		let store_inst;
		let placeID;
		let escrowAddress;

		return StoreRegistry.deployed().then(instance =>{
			registry_inst = instance;
			return instance.addStore('canteen1')
		}).then(() =>{
			return registry_inst.escrowAddress();
		}).then(address =>{
			escrowAddress = address;
		}).then(() =>{
			return registry_inst.getStoreAddress('canteen1');
		}).then(address =>{
			return Store.at(address);
		}).then(instance =>{
			store_inst = instance;
			return store_inst.placeID();
		}).then(result =>{
			assert.equal(result, 'canteen1', 'placeID should be properly initialized');
			return store_inst.escrowAddress();
		}).then(address =>{
			assert.equal(address, escrowAddress, 'escrowAddress should be properly initialized');
		});
	});

	it('addReview should only callable by escrowAddress', ()=>{
		let store_inst;
		let escrowAddress = accounts[0];
		let placeID = 'canteen2';

		return Store.new(placeID, escrowAddress).then(instance =>{
			store_inst = instance;
			return store_inst.addReview("this store is great", 95, accounts[1], {from: accounts[0]})
		}).then(() =>{
			return store_inst.totalReviewAmount();
		}).then(amount =>{
			assert.equal(amount, 1, 'new review should be added');
			return store_inst.addReview("this is another review", 30, accounts[1], {from: accounts[2]})
		}).catch(error =>{
			return store_inst.totalReviewAmount();
		}).then(amount =>{
			assert.equal(amount, 1, 'new review from non-escrow should fail');
		});
	});

	it('only valid store could pass', ()=>{
		let store_inst;
		let escrowAddress = accounts[0];
		let placeID = 'canteen3';

		return Store.new(placeID, escrowAddress).then(instance =>{
			store_inst = instance;
			return store_inst.addReview("test review", 0, accounts[1], {from: accounts[0]});
		}).then(() =>{
			return store_inst.totalReviewAmount();
		}).then(amount =>{
			assert.equal(amount, 1, 'score of 0 should be valid');
			return store_inst.addReview("test review", 100, accounts[2], {from: accounts[0]});
		}).then(() =>{
			return store_inst.totalReviewAmount();
		}).then(amount =>{
			assert.equal(amount, 2, 'score of 100 should be valid');
			return store_inst.addReview("test review", 101, accounts[3], {from: accounts[0]});
		}).catch(() =>{
			return store_inst.totalReviewAmount();
		}).then(amount =>{
			assert.equal(amount, 2, 'any score over 100 should fail');
			return store_inst.addReview("test review", -1, accounts[4], {from: accounts[0]});
		}).catch(error =>{
			assert.isNotNull(error,'any score under 0 should fail');
		})
	});

	it('new review content, review index should be correct', ()=>{
		let store_inst;
		let escrowAddress = accounts[0];
		let placeID = 'canteen4';

		return Store.new(placeID, escrowAddress).then(instance =>{
			store_inst = instance;
			return store_inst.addReview("nice food", 80, accounts[9], {from: accounts[0]});
		}).then(() =>{
			return store_inst.allReviews(0)
		}).then(review =>{
			assert.equal(review[0], 'nice food', 'review comment should match');
			assert.equal(review[1], 80, 'review score should match');
			assert.equal(review[2], accounts[9], 'review uploader should match');
			assert.equal(review[3], 0, 'review upvote should be 0');
			assert.equal(review[4], 0, 'review downvote should be 0');
			assert.equal(review[6], 0, 'review positive impact should be 0');
			assert.equal(review[7], 0, 'review negative impact should be 0');
			assert.notEqual(review[5], 0, 'review block height should be initalized');

			return store_inst.reviewIndexPlusOneByReviewer(accounts[9]);
		}).then(index =>{
			assert.equal(index, 1, 'index plus one should be 1');
			return store_inst.addReview("another review", 40, accounts[8], {from: accounts[0]});
		}).then(() =>{
			return store_inst.reviewIndexPlusOneByReviewer(accounts[8]);
		}).then(index =>{
			assert.equal(index, 2, 'index of second reviewer should be 2');
		});
	});

	it('testing update review', ()=>{
		let store_inst;
		let escrowAddress = accounts[0];
		let placeID = 'canteen4';

		return Store.new(placeID, escrowAddress).then(instance =>{
			store_inst = instance;
			return store_inst.addReview("great food", 80, accounts[1], {from: accounts[0]});
		}).then(() =>{
			return store_inst.totalReviewAmount();
		}).then(amount =>{
			assert.equal(amount, 1, 'new review should be added');
			return store_inst.addReview("update my review", 40, accounts[1], {from: accounts[0]});
		}).then(() =>{
			return store_inst.totalReviewAmount();
		}).then(amount =>{
			assert.equal(amount, 1, 'total reivew should be the same, just updated.');
			return store_inst.totalScore();
		}).then(score =>{
			assert.equal(score, 40, 'score should be updated');
		});
	});

	it('testing score calculation', ()=>{
		let store_inst;
		let escrowAddress = accounts[0];
		let placeID = 'canteen1';

		return Store.new(placeID, escrowAddress).then(instance =>{
			store_inst = instance;
			return store_inst.addReview("first review", 100, accounts[1], {from:accounts[0]});
		}).then(() =>{
			return store_inst.totalScore();
		}).then(score =>{
			assert.equal(score, 100, 'score should be 100');
			return store_inst.addReview("second review", 80, accounts[2], {from: accounts[0]});
		}).then(() =>{
			return store_inst.totalScore();
		}).then(score =>{
			assert.equal(score, 180, 'total score should be 180');
			return store_inst.addReview("third review", 20, accounts[3], {from: accounts[0]});
		}).then(() =>{
			return store_inst.totalScore()
		}).then(score =>{
			assert.equal(score, 200, 'total score should be 200')
		});
	});

	it('only escrow can vote for existing review', ()=>{
		let store_inst;
		let escrowAddress = accounts[0];
		let placeID ="canteen1";

		return Store.new(placeID, escrowAddress).then(instance =>{
			store_inst = instance;
			return store_inst.addReview("test review", 90, accounts[1], {from: accounts[0]});
		}).then(() =>{
			return store_inst.voteReview(accounts[9], accounts[1], true, 10000, {from: accounts[2]});
		}).catch(err =>{
			assert.isNotNull(err, 'non-escrow vote should fail');
		}).then(() =>{
			return store_inst.voteReview(accounts[9], accounts[1], true, 10000, {from: accounts[0]});
		}).then(() =>{
			return store_inst.voted(accounts[9], accounts[1])
		}).then(result =>{
			assert.equal(result, true, 'escrow vote should pass');
			return store_inst.voteReview(accounts[9], accounts[5], true, 10000, {from: accounts[0]});
		}).catch(err =>{
			assert.isNotNull(err, 'voting for non-existent review should fail');
		});
	});

	it('vote correctly counted with log', ()=>{
		let store_inst;
		let escrowAddress = accounts[0];
		let placeID ="canteen1";

		return Store.new(placeID, escrowAddress).then(instance =>{
			store_inst = instance;
			return store_inst.addReview("test review", 90, accounts[1], {from: accounts[0]});
		}).then(() =>{
			return store_inst.voteReview(accounts[9], accounts[1], true, 10000, {from: accounts[0]});
		}).then(receipt =>{
			assert.equal(receipt.logs[0].event, 'LogVoteAdded', 'should emit LogVoteAdded event');
			return store_inst.allReviews(0);
		}).then(review =>{
			assert.equal(review[3], 1, 'one upvote should exist');
			assert.equal(review[6], 10100, 'positive impact should be 10100')
			return store_inst.voteReview(accounts[9], accounts[1], false, 10000, {from: accounts[0]});
		}).catch(err =>{
			assert.isNotNull(err, 'should not double vote');
			return store_inst.voteReview(accounts[8], accounts[1], false, 8000, {from: accounts[0]});
		}).then(receipt =>{
			assert.equal(receipt.logs[0].event, 'LogVoteAdded', 'should emit LogVoteAdded event');
			return store_inst.allReviews(0);
		}).then(review =>{
			assert.equal(review[4], 1, 'one downvote should exist');
			assert.equal(review[7], 8100, 'negative impact should be 8100');
		});
	});

	it('getImpact should work', ()=>{
		let store_inst;
		let escrowAddress = accounts[0];
		let placeID ="canteen1";

		return Store.new(placeID, escrowAddress).then(instance =>{
			store_inst = instance;
			return store_inst.addReview("test review", 90, accounts[1], {from: accounts[0]});
		}).then(() =>{
			return store_inst.voteReview(accounts[9], accounts[1], true, 10000, {from: accounts[0]});
		}).then(() =>{
			return store_inst.getImpact(accounts[1]);
		}).then(impact =>{
			assert.equal(impact[0], 10100, 'positive impact should match');
			assert.equal(impact[1], 0, 'positive impact should match');
			return store_inst.voteReview(accounts[8], accounts[1], false, 8000, {from: accounts[0]});
		}).then(() =>{
			return store_inst.getImpact(accounts[1]);
		}).then(impact =>{
			assert.equal(impact[0], 10100, 'positive impact should match');
			assert.equal(impact[1], 8100, 'positive impact should match');
		});
	});
});