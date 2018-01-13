pragma solidity ^0.4.17;
import './Store.sol';

contract Escrow{
 	// map user address with its credibility score: [0,1000]
  mapping (address => uint256) public credibility;
  // map reviewer, store with index in vettings array.
  mapping (address => mapping(address => uint256)) public vettingIndex;
  // map reviewer with a list of index for active reviews/vettings
  mapping (address => uint[]) public activeVettingIndexListByUser;
  // map user with claimable reward
  mapping (address => uint256) public settlements;
  // NOTE:non-empty vettings starts at index 1 !!
  Vetting[] public vettings;
  
  address public storeRegistry;

  struct Vetting{
    address store;
    address reviewer;
    uint256 deposit;
    uint256 last_update;
    address[] upvoters;
    address[] downvoters;
  }

  /*
	* Constructor
  */
  function Escrow(address _registry) public {
    storeRegistry = _registry;
    // vettings starts at index 1
    vettings.length ++;
  }

  /*
  * Fallback Functions
  */
  function () public
    payable {
      
  }
  
  /*
  * Public Functions
  */

  function review(address _store, address _reviewer, string _comment, uint256 _score)
    public
    payable {
      require(noMaturedVetting(_reviewer));
      // if store doesn't exist, if statement would fail and state will revert.
      Store store = Store(_store);
      
      if (vettingIndex[_reviewer][_store] == 0){
      	// If user send with deposit no less than 0.01 ETH, it will be considered as participating in 
      	// peer-review phase which counts them eligible for reward based on votes.
      	// Otherwise, it would just be a normal review.
        require(msg.value >= 10000000000000000);

        Vetting memory newVetting;
        newVetting.store = _store;
        newVetting.reviewer = _reviewer;
        newVetting.deposit = msg.value;
        newVetting.last_update = block.timestamp;

        vettings.push(newVetting);
        vettingIndex[_reviewer][_store] = vettings.length-1;
        activeVettingIndexListByUser[_reviewer].push(vettings.length-1);
        
        store.addReview(_comment, _score, _reviewer);
       
      } else {
        // update already submitted review within vetting period and post-vetting
        vettings[vettingIndex[_reviewer][_store]].last_update = block.timestamp;
        store.addReview(_comment, _score, _reviewer);
      }
  }

  // For reviews that doesn't wish to participate in vetting process.
  function noVettingReview (address _store, address _reviewer, string _comment, uint256 _score) 
    public {
      Store store = Store(_store);
      store.addReview(_comment, _score, _reviewer);
  }
  

  function vote(address _store, address _voter, address _reviewer, bool _is_upvote) 
  	public {
      require(noMaturedVetting(_voter));
      // NOTE: this version of contract doesn't reward voter.
	    Store store = Store(_store);
      store.voteReview(_voter, _reviewer, _is_upvote, credibility[_voter]);
      // if the review being voted is still in vetting period, include for settlement
      if (vettingIndex[_reviewer][_store] != 0){
        if (_is_upvote){
          vettings[vettingIndex[_reviewer][_store]].upvoters.push(_voter);
        } else {
          vettings[vettingIndex[_reviewer][_store]].downvoters.push(_voter);
        }
      }
  }

  function settle(address _reviewer) public{
  	// inspecting all active reviews of this reviewer
  	for (uint i=0; i<activeVettingIndexListByUser[_reviewer].length; i++){
      uint256 index = activeVettingIndexListByUser[_reviewer][i];

  		if (now > vettings[index].last_update + 7 days && index != 0){
  			// if the active period (7 days) has passed, then finalized and settled the reward.
        // reward consists of the original deposit from reviewer + base reward 0.001 ether +
        Store store = Store(vettings[index].store);
        uint256 positive_impact;
        uint256 negative_impact;
        (positive_impact, negative_impact) = store.getImpact(_reviewer);
        if (positive_impact >= negative_impact){
          // settle for reviewer
          settlements[_reviewer] += calculateReward(index, positive_impact - negative_impact);
          credibility[_reviewer] = (credibility[_reviewer]*90 + 10000)/100;
          // settle for voters
          for (uint j=0; j<vettings[index].upvoters.length; j++){
            // fixed reward of 0.0001 ether, 2% increase in credibility
            settlements[vettings[index].upvoters[j]] += 100000000000000;
            credibility[vettings[index].upvoters[j]] = (credibility[vettings[index].upvoters[j]]*98 + 2000)/100;
          }
          for (uint k=0; k<vettings[index].downvoters.length; k++){
            // loss of 5% credibility in case of unpopular vote
            credibility[vettings[index].downvoters[k]] = credibility[vettings[index].downvoters[k]]*95/100;
          }
        } else {
          // settle for reviewer
          // settlements doesn't change (i.e. no reward, lose initial deposit)
          // credibility of reviewer drop to 0.9 of its original value.
          credibility[_reviewer] = (credibility[_reviewer]*90)/100;
          // settle for voters
          for (uint l=0; l<vettings[index].downvoters.length; l++){
            // fixed reward of 0.0001 ether, 2% increase in credibility
            settlements[vettings[index].downvoters[l]] += 100000000000000;
            credibility[vettings[index].downvoters[l]] = (credibility[vettings[index].downvoters[l]]*98 + 2000)/100;
          }
          for (uint m=0; m<vettings[index].upvoters.length; m++){
            // loss of 5% credibility in case of unpopular vote
            credibility[vettings[index].upvoters[m]] = credibility[vettings[index].upvoters[m]]*95/100;
          }
        }
        // delete this settled review from active list
        delete vettingIndex[_reviewer][vettings[index].store];
        delete activeVettingIndexListByUser[_reviewer][i];
        delete vettings[index];
  		}
  	}
  }

  // reviewer could claim settements after calling settle function.
  function claim (address _claimer) 
    public {
      uint256 claimable = settlements[_claimer];
      require(claimable > 0);
      // set to zero first to prevent reentry.
      settlements[_claimer] = 0;
      _claimer.transfer(claimable);
  }  

  // make sure all finished active reviews are settled (i.e. credibility has been updated)
  // before allowing further review or vote.
  function noMaturedVetting(address _reviewer) 
    public 
    constant
    returns (bool) { 
      for (uint i=0; i< activeVettingIndexListByUser[_reviewer].length; i++){
        // every review has 7 days period for public to vote/vet
        // within 7 days, they are active. 
        if (now > vettings[activeVettingIndexListByUser[_reviewer][i]].last_update + 7 days && activeVettingIndexListByUser[_reviewer][i] > 0){
          return false;
        }
      }
      return true;
  }
  
  /*
  * Internal Functions
  */

  function calculateReward (uint256 _index, uint256 _net_vote) 
    internal
    returns(uint256) {
      // if _is_positive is true, reward = initial deposit + base reward (0.002 ether) + _net_vote*(1/1000000) ether.
      // otherwise, no reward, which for reviewer would a loss (initial deposit)
      // NOTE: _net_vote/1000000 is likely to be zero. therefore, we use equivalent _net_vote*100 wei.
      
      return vettings[_index].deposit + 2000000000000000 + _net_vote*1000000000000;
  }
}