pragma solidity ^0.4.17;

contract StoreRegistry{
  mapping (bytes32 => address) public registry;
  address public escrowAddress;

  event LogStoreCreated(address indexed store_address);

  /*
	* Constructor
  */
  function StoreRegistry(){
  	// Create global escrow which process votes and bets on all reviews in any store.
    Escrow escrow = new Escrow(this);
    escrowAddress = address(escrow);
  }

  /*
	* Public Functions
  */

  /// _placeID:unique identifier for each store based on Google Map PlaceID
  function addStore(string _placeID) public {
    require(registry[sha256(_placeID)] == 0x0);

    Store newStore = new Store(_placeID, escrowAddress);
    registry[sha256(_placeID)] = address(newStore);
    LogStoreCreated(address(newStore));
  }

  function getStoreAddress(string _placeID)
    public constant
    returns (address){
      return registry[sha256(_placeID)]; 
  }

  function storeExist(string _placeID)
    public constant
    returns (bool){
      if (registry[sha256(_placeID)] == 0x0){
        return false;
      } else {
        return true;
      }
  }
}


contract Store {
  // unique identifier for each store based on Google Map PlaceID
  string public placeID;
  uint256 public totalScore;
  uint256 public totalReviewAmount;
  Review[] public allReviews;
  // map reviewer address with its index value in allReviews array +1
  // as allReviews index starts with 0, and mapping is initialized with 0. 
  mapping (address => uint256) public reviewIndexPlusOneByReviewer;
  // first address: voter; second address: reviewer
  mapping (address => mapping (address => bool) ) public voted;
  address public escrowAddress;
  
  struct Review {
    string comment;
    uint256 score;
    address uploader;
    uint256 upvote;
    uint256 downvote;
    uint256 creation_blockstamp;
    uint256 positive_impact;
    uint256 negative_impact;
  }

  event LogVoteAdded(address indexed voter, address indexed reviewer, bool is_upvote);

  modifier onlyEscrow(){
    require(msg.sender == escrowAddress);
    _;
  }

  modifier validScore(uint256 _score) {
    require(_score >= 0 && _score <= 100);
    _;
  }

  modifier validVote(address _voter, address _reviewer) { 
    require(voted[_voter][_reviewer] == false);
    _; 
  }

  /*
  * Constructor
  */
  function Store(string _placeID, address _escrowAddress) public {
    placeID = _placeID;
    escrowAddress = _escrowAddress;
  }

  /*
  * Public Functions
  */
  function addReview(string _comment, uint256 _score, address _uploader)
    public
    onlyEscrow
    validScore(_score) {

      if (reviewIndexPlusOneByReviewer[_uploader] != 0){
        // update review
        // NOTE: everytime a review gets updated, its creation_blockstamp will be reset to extend 
        // the active period.
        totalScore = totalScore + _score - allReviews[reviewIndexPlusOneByReviewer[_uploader] - 1].score;
        allReviews[reviewIndexPlusOneByReviewer[_uploader] - 1].comment = _comment;
        allReviews[reviewIndexPlusOneByReviewer[_uploader] - 1].score = _score;
        allReviews[reviewIndexPlusOneByReviewer[_uploader] - 1].creation_blockstamp = block.timestamp;
      } else {
        // add new review
        totalReviewAmount = totalReviewAmount + 1;
        totalScore = totalScore + _score;
        Review memory new_review;

        new_review.comment = _comment;
        new_review.score = _score;
        new_review.uploader = _uploader;
        new_review.creation_blockstamp = block.timestamp;
        allReviews.push(new_review);
        reviewIndexPlusOneByReviewer[_uploader] = totalReviewAmount;
      }
  }

  function voteReview(address _voter, address _reviewer, bool _is_upvote, uint256 _credibility) 
    public
    onlyEscrow
    validVote(_voter, _reviewer) {

      voted[_voter][_reviewer] = true;
      
      // increase all credibility score by 100 (on a scale of 1000)
      // so that vote from new user whose credibility is 0, still amounts to meaningful vote.
      if (_is_upvote){
        allReviews[reviewIndexPlusOneByReviewer[_reviewer] - 1].upvote += 1;
        allReviews[reviewIndexPlusOneByReviewer[_reviewer] - 1].positive_impact += (_credibility+100);
      }
      else{
        allReviews[reviewIndexPlusOneByReviewer[_reviewer] - 1].downvote += 1;
        allReviews[reviewIndexPlusOneByReviewer[_reviewer] - 1].negative_impact -= (_credibility+100);
      }
      
    LogVoteAdded(_voter, _reviewer, _is_upvote);
  }

  function getImpact (address _reviewer)
    public
    constant
    returns(uint256, uint256) {
    return (allReviews[reviewIndexPlusOneByReviewer[_reviewer]-1].positive_impact,
      allReviews[reviewIndexPlusOneByReviewer[_reviewer]-1].negative_impact);
  }
  
}


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