const StoreRegistry = artifacts.require("./StoreRegistry.sol");
const Store = artifacts.require("./Store.sol");
const Escrow = artifacts.require("./Escrow.sol");

const HttpProvider = require('ethjs-provider-http');
const EthRPC = require('ethjs-rpc');
const EthQuery = require('ethjs-query');
const ethRPC = new EthRPC(new HttpProvider(`http://localhost:8545`));
const ethQuery = new EthQuery(new HttpProvider(`http://localhost:8545`));

contract('StoreRegistry', accounts => {
	describe('Escrow Constructor', ()=>{
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
	});
	
	describe('addStore, getStoreAddress, storeExist functions', ()=>{
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
});

contract('Store', accounts =>{
	describe('Store Constructor', ()=>{
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
	});
	
	describe('addReview function', ()=>{
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
	});
	
	describe('voteReview function', ()=>{
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
	});
	
	describe('getImpact function', ()=>{
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
});

contract('Escrow', accounts =>{
	var getEscrowWithStorePromise = (placeID) =>{
		let registry_inst;
		let escrow_inst;
		let store_address = [];

		return new Promise((resolve, reject) =>{
			StoreRegistry.new()
			.then(instance =>{
				registry_inst = instance;
				return registry_inst.escrowAddress();
			})
			.then(address => {
				escrow_address = address;
				return Promise.all(
					placeID.map((curr, i, arr) =>{
						return registry_inst.addStore(curr)
						.then(() => registry_inst.getStoreAddress(curr))
						.then(address => store_address.push(address))
				}));
			})
			.then(() => {
				return registry_inst.escrowAddress()
			})
			.then(address => Escrow.at(address))
			.then(instance => {
				escrow_inst = instance;
				resolve([escrow_inst, store_address]);
			})
			.catch(err => { reject(new Error(err)) });
		});
	}

	var sendPromise = (method, params) =>{
		return new Promise((resolve, reject) =>{
			ethRPC.sendAsync({
				method: method,
				params: params || []
			}, (err, result) =>{
				if (err)
					reject(new Error(err))
				else{
					resolve(result)
				}
			})
		})
	}
	// correctness of constructor has been tested in StoreRegistry test suites above
	describe('review function', ()=>{
		it('test review deposit', ()=>{
			let escrow_inst;
			let store_address;

			return getEscrowWithStorePromise(['canteen1'])
			.then(result =>{
				escrow_inst = result[0];
				store_address = result[1][0];
				return escrow_inst.review(store_address, accounts[1], "good store", 90, {from: accounts[1], value:10000000000000000});
			}).catch(err =>{
				assert.isNull(err, 'review should success with sufficient deposit');
			}).then(() =>{
				return escrow_inst.review(store_address, accounts[2], "good store", 90, {from: accounts[2], value:9000000000000000});
			}).catch(err =>{
				assert.isNotNull(err, 'review should fail with insufficient deposit');
			});
		});

		it('test noMaturedVetting function', ()=>{
				 let escrow_inst;
				 let store_address;
				 return getEscrowWithStorePromise(['canteen1','canteen2'])
				 .then(result =>{
				 	escrow_inst = result[0];
				 	store_address = result[1];
				 	return escrow_inst.review(store_address[0], accounts[0], "first comment on canteen1", 80, {from:accounts[0], value:10000000000000000});
				 })
				 .then(() => escrow_inst.vettings(1))
				 .then(vetting => {
				 	assert.equal(vetting[0], store_address[0], 'new review should be added');
				 	return web3.eth.getBlock('latest').timestamp
				 })
				 .then(block => {
				 	console.log("current block: "+ block);
				 	return sendPromise('evm_increaseTime',[604800+10])
				 })
				 .then(() => sendPromise('evm_mine', []))
				 .then(() => web3.eth.getBlock('latest').timestamp)
				 .then(block => console.log("after fast forwarding 7 days: "+block))
				 .then(() => escrow_inst.review(store_address[1], accounts[0], "second comment", 80, {from:accounts[0], value:10000000000000000}))
				 .catch(err => assert.isNotNull(err, 'with pending settlements, new review should fail'))
				 .then(() => escrow_inst.settle(accounts[0]))
				 .then(() => escrow_inst.vettingIndex(accounts[0], store_address[0]))
				 .then(index => assert.equal(index, 0, 'active vetting should be settled.'))
				 .then(() => escrow_inst.review(store_address[1], accounts[0], "third comment", 90, {from:accounts[0], value:10000000000000000}))
				 .then(() => escrow_inst.vettings(2))
				 .then(review => assert.equal(review[0], store_address[1], 'new review should be added'))
			}
		);
		
		it('add(or update)review function', ()=>{
			let escrow_inst;
			let store_address;
			let first_timestamp;

			return getEscrowWithStorePromise(['canteen1', 'canteen2'])
			.then(result =>{
				escrow_inst = result[0];
				store_address = result[1];
				return escrow_inst.review(store_address[0], accounts[1], "first comment for canteen1", 90, {from: accounts[2], value:12345678901234567});
			})
			.then(() => escrow_inst.vettings(1))
			.then(vetting => {
				assert.equal(vetting[0], store_address[0], 'store address should match');
				assert.equal(vetting[1], accounts[1], 'reviewer should match');
				assert.equal(vetting[2], 12345678901234567, 'deposit should match');
				assert.notEqual(vetting[3], 0, 'last_update should not be 0');
				first_timestamp = vetting[3];
				return escrow_inst.vettingIndex(accounts[1], store_address[0])
			})
			.then(index => {
				assert.equal(index, 1, 'vettingIndex should be updated');
				return escrow_inst.activeVettingIndexListByUser(accounts[1],0);
			})
			.then(index => assert.equal(index, 1, 'activeVettingIndexListByUser should update'))
			.then(() => sendPromise('evm_increaseTime', [1000])) // increase random time)
			.then(() => sendPromise('evm_mine',[]))
			.then(() => escrow_inst.review(store_address[0], accounts[1], "update comment for canteen1", 80, {from: accounts[2], value:0}))
			.then(() => escrow_inst.vettings(1))
			.then(vetting => {
				assert.equal(vetting[2], 12345678901234567, 'deposit should not change');
				assert.isBelow(first_timestamp, vetting[3], 'last_update should be updated');
			});
		});
	});

	describe('vote function', () =>{
		it('only vote on non-empty review', () =>{
			let escrow_inst;
			let store_address;
			let store_inst;

			return getEscrowWithStorePromise(['canteen1'])
			.then(result =>{
				escrow_inst = result[0];
				store_address = result[1][0];
				return escrow_inst.vote(store_address, accounts[0], accounts[9], true)
			})
			.catch(err => {
				assert.isNotNull(err, 'should not vote a reviewer without review');
				return escrow_inst.review(store_address, accounts[9], "first comment on canteen1", 80, {from:accounts[9], value:10000000000000000});
			})
			.then(() => escrow_inst.vote(store_address, accounts[0], accounts[9], true))
			.then(() => Store.at(store_address))
			.then(instance =>{
				store_inst = instance;
				return store_inst.voted(accounts[0], accounts[9])
			})
			.then(voted => {
				assert.equal(voted, true, 'should voted')
			})
		});

		it('no double vote', () =>{
			let escrow_inst;
			let store_address;
			let store_inst;

			return getEscrowWithStorePromise(['canteen1'])
			.then(result =>{
				escrow_inst = result[0];
				store_address = result[1][0];
				return escrow_inst.review(store_address, accounts[9], "first comment on canteen1", 80, {from:accounts[9], value:10000000000000000});
			})
			.then(() => escrow_inst.vote(store_address, accounts[0], accounts[9], true))
			.then(() => Store.at(store_address))
			.then(instance =>{
				store_inst = instance;
				return store_inst.voted(accounts[0], accounts[9])
			})
			.then(voted => {
				assert.equal(voted, true, 'should voted')
			})
			.then(() => escrow_inst.vote(store_address, accounts[0], accounts[9], false))
			.catch(err => assert.isNotNull(err, 'should not be able to double vote'))
		});
	});

	describe('settle function', ()=>{
		it('should not settle before vetting matured', ()=>{
			let escrow_inst;
			let store_address;

			return getEscrowWithStorePromise(['canteen1'])
			.then(result =>{
				escrow_inst = result[0];
				store_address = result[1][0];
				return escrow_inst.review(store_address, accounts[9], "first comment on canteen1", 90, {from: accounts[9], value:10000000000000000});
			})
			.then(() => escrow_inst.vote(store_address, accounts[0], accounts[9], true))
			.then(() => escrow_inst.settle(accounts[9]))
			.then(() => escrow_inst.settlements(accounts[9]))
			.then(amount => assert(amount, 0, 'should not settle yet'))
		});
		
		it('should settle with correct settlements and credibility', ()=>{
			let escrow_inst;
			let store_address;

			return getEscrowWithStorePromise(['canteen1', 'canteen2'])
			.then(result =>{
				escrow_inst = result[0];
				store_address = result[1];
				return escrow_inst.review(store_address[0], accounts[9], "first comment on canteen1", 90, {from: accounts[9], value:10000000000000000});
			})
			.then(() => escrow_inst.vote(store_address[0], accounts[0], accounts[9], true))
			.then(() => escrow_inst.vote(store_address[0], accounts[1], accounts[9], true))
			.then(() => escrow_inst.vote(store_address[0], accounts[2], accounts[9], false))
			.then(() => sendPromise('evm_increaseTime', [604800+10]))
			.then(() => sendPromise('evm_mine', []))
			.then(() => escrow_inst.settle(accounts[9]))
			.then(() => escrow_inst.settlements(accounts[9]))
			.then(amount => assert.equal(amount, 10200000000000000, 'reward should be 0.01002 ether'))
			.then(() => escrow_inst.credibility(accounts[9]))
			.then(credibility => assert.equal(credibility, 100, 'credibility should increase to 100'))
			.then(() => escrow_inst.review(store_address[1], accounts[9], "nasty comment on canteen1", 20, {from: accounts[9], value:10000000000000000}))
			.then(() => escrow_inst.vote(store_address[1], accounts[0], accounts[9], false))
			.then(() => escrow_inst.vote(store_address[1], accounts[1], accounts[9], false))
			.then(() => escrow_inst.vote(store_address[1], accounts[2], accounts[9], false))
			.then(() => sendPromise('evm_increaseTime', [604800+10]))
			.then(() => sendPromise('evm_mine', []))
			.then(() => escrow_inst.settle(accounts[9]))
			.then(() => escrow_inst.settlements(accounts[9]))
			.then(amount => assert.equal(amount, 10200000000000000, 'new reward should be 0, thus no change'))
			.then(() => escrow_inst.credibility(accounts[9]))
			.then(credibility => assert.equal(credibility, 90, 'credibility should decrease to 90'))
		});

		it('should delete/reset index after settlements', ()=>{
			let escrow_inst;
			let store_address;

			return getEscrowWithStorePromise(['canteen1'])
			.then(result =>{
				escrow_inst = result[0];
				store_address = result[1][0];
				return escrow_inst.review(store_address, accounts[9], "first comment on canteen1", 90, {from: accounts[9], value:10000000000000000});
			})
			.then(() => escrow_inst.vettingIndex(accounts[9], store_address))
			.then(index => {
				assert.equal(index, 1, 'vettingIndex index should be 1');
				return escrow_inst.activeVettingIndexListByUser(accounts[9], 0)
			})
			.then(index => assert.equal(index, 1, 'activeVettingIndexListByUser should be 1'))
			.then(() => sendPromise('evm_increaseTime', [604800+10]))
			.then(() => sendPromise('evm_mine', []))
			.then(() => escrow_inst.settle(accounts[9]))
			.then(() => escrow_inst.vettingIndex(accounts[9], store_address))
			.then(index => {
				assert.equal(index, 0, 'vettingIndex index should reset');
				return escrow_inst.activeVettingIndexListByUser(accounts[9], 0)
			})
			.then(index => assert.equal(index, 0, 'activeVettingIndexListByUser should reset'))
		});
	});
});