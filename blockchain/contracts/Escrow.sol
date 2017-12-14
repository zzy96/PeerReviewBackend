pragma solidity ^0.4.17;
import './Store.sol';

contract Escrow{
  // base reward(in ether) for each reviewer's review in one store
  // BASE_REVIEW_REWARD = 0.0001;

  // reward(in ether) per net vote (with each credibility range from 0 to 1000)
  // 0.01 ether for 10,000 credibility
  // REWARD_PER_MILLION_NET_VOTE = 1;

	// map user address with its credibility score: [0,1000]
  mapping (address => uint256) public credibility;
  // map user with its list of active review
  mapping (address => ActiveReview[]) public allActiveReviews;
  // map user with claimable reward
  mapping (address => uint256) public settlements;
  
  
  address public storeRegistry;

  struct ActiveReview{
    address store;
    address reviewer;
    uint256 deposit;
    uint256 blockstamp;
  }

  // make sure all finished active reviews are settled (i.e. credibility has been updated)
  // before allowing further review or vote.
  modifier noPendingSettlement(address _reviewer) { 
  	for (uint i=0; i< allActiveReviews[_reviewer].length; i++){
  		// every review has 7 days period for public to vote
  		// within 7 days, they are active. 
  		require(now < allActiveReviews[_reviewer][i].blockstamp + 7 days);
  	}
  	_; 
  }
  
  /*
	* Constructor
  */
  function Escrow(address _registry) public {
    storeRegistry = _registry;
  }

  /*
  * Public Functions
  */

  function review(address _store, address _reviewer, string _comment, uint256 _score)
  	noPendingSettlement(_reviewer)
    public
    payable {
      Store store = Store(_store);
      // if store doesn't exist, if statement would fail and state will revert.
      if (store.reviewIndexPlusOneByReviewer(_reviewer) == 0){
      	// If user send with deposit no less than 0.01 ETH, it will be considered as participating in 
      	// peer-review phase which counts them eligible for reward based on votes.
      	// Otherwise, it would just be a normal review.
        if (msg.value >= 10000000000000000){
          ActiveReview memory activeReview;
          activeReview.store = _store;
          activeReview.reviewer = _reviewer;
          activeReview.deposit = msg.value;
          activeReview.blockstamp = block.timestamp;
          allActiveReviews[_reviewer].push(activeReview);
          store.addReview(_comment, _score, _reviewer);
        }
      } else {
        store.addReview(_comment, _score, _reviewer);
      }
  }

  function vote(address _store, address _voter, address _reviewer, bool _is_upvote) 
  	noPendingSettlement(_voter)
  	public {
	    Store store = Store(_store);
	    store.voteReview(_voter, _reviewer, _is_upvote, credibility[_voter]);
  }

  function settle(address _reviewer) public{
  	// inspecting all active reviews of this reviewer
  	for (uint i=0; i<allActiveReviews[_reviewer].length; i++){
  		if (now > allActiveReviews[_reviewer][i].blockstamp + 7 days){
  			// if the active period (7 days) has passed, then finalized and settled the reward.
        // reward consists of the original deposit from reviewer + base reward 0.001 ether +
        Store store = Store(allActiveReviews[_reviewer][i].store);
        uint256 positive_impact;
        uint256 negative_impact;
        (positive_impact, negative_impact) = store.getImpact(_reviewer);
        if (positive_impact >= negative_impact){
          settlements[_reviewer] = calculateReward(_reviewer, i, positive_impact - negative_impact, true);
          credibility[_reviewer] = (credibility[_reviewer]*90 + 10000)/100;
        } else {
          settlements[_reviewer] = calculateReward(_reviewer, i, negative_impact - positive_impact, false);
          credibility[_reviewer] = (credibility[_reviewer]*90)/100;
        }
        // delete this settled review from active list
        delete allActiveReviews[_reviewer][i];
  		}
  	}
  }

  function calculateReward (address _reviewer, uint256 _activeReviewIndex, uint256 _net_vote, bool _is_positive) 
    internal
    returns(uint256) {
      if (_is_positive){
        return allActiveReviews[_reviewer][_activeReviewIndex].deposit + 0.0001 ether + _net_vote/1000000 ether;
      } else {
        return 0;
      }
  }

  // reviewer could claim settements after calling settle function.
  function claim (address _claimer) 
    public {
      uint256 claimable = settlements[_claimer];
      require(claimable >= 0);
      // set to zero first to prevent reentry.
      settlements[_claimer] = 0;
      _claimer.transfer(claimable);
    }    
}