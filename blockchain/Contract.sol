pragma solidity ^0.4.17;

contract Store {

  string public placeID;
  uint256 public totalScore;
  uint256 public totalReviewAmount;
  Review[] public allReviews;
  // map reviewer address with array index +1
  mapping (address => uint256) public mappingByReviewer;
  mapping (address => mapping (address => bool) ) public voted;
  address escrowAddress;
  
  struct Review {
    string comment;
    uint256 score;
    address uploader;
    uint256 upvote;
    uint256 downvote;
    uint256 creation_blockstamp;
    uint256 authenticity;
    uint256 impact;
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

  function Store(string _placeID, address _escrowAddress) public {
    placeID = _placeID;
    escrowAddress = _escrowAddress;
  }

  // calculate authenticity, impact and return reward
  function settleReview(address _reviewer)
    public
    onlyEscrow
    returns (bool, uint256) {
      allReviews[mappingByReviewer[_reviewer]].impact = allReviews[mappingByReviewer[_reviewer]].upvote + allReviews[mappingByReviewer[_reviewer]].downvote;
      if (allReviews[mappingByReviewer[_reviewer]].upvote > allReviews[mappingByReviewer[_reviewer]].downvote){
        allReviews[mappingByReviewer[_reviewer]].authenticity = allReviews[mappingByReviewer[_reviewer]].upvote - allReviews[mappingByReviewer[_reviewer]].downvote;
        return(true, allReviews[mappingByReviewer[_reviewer]].authenticity*allReviews[mappingByReviewer[_reviewer]].impact);
      } else {
        allReviews[mappingByReviewer[_reviewer]].authenticity = allReviews[mappingByReviewer[_reviewer]].downvote - allReviews[mappingByReviewer[_reviewer]].upvote;
        return(false, allReviews[mappingByReviewer[_reviewer]].authenticity*allReviews[mappingByReviewer[_reviewer]].impact);
      }
  }

  function addReview(string _comment, uint256 _score, address _uploader)
    public
    onlyEscrow
    validScore(_score) {

      if (mappingByReviewer[_uploader] != 0){
        totalScore = totalScore + _score - allReviews[mappingByReviewer[_uploader] - 1].score;
        allReviews[mappingByReviewer[_uploader] - 1].comment = _comment;
        allReviews[mappingByReviewer[_uploader] - 1].score = _score;
        allReviews[mappingByReviewer[_uploader] - 1].creation_blockstamp = block.timestamp;
      } else {
        totalReviewAmount = totalReviewAmount + 1;
        totalScore = totalScore + _score;
        Review memory new_review;
        new_review.comment = _comment;
        new_review.score = _score;
        new_review.uploader = _uploader;
        new_review.upvote = 0;
        new_review.downvote = 0;
        new_review.creation_blockstamp = block.timestamp;
        allReviews.push(new_review);
        mappingByReviewer[_uploader] = totalReviewAmount;
      }
  }

  function voteReview(address _voter, address _reviewer, bool _is_upvote, uint256 credibility) 
    public
    validVote(_voter, _reviewer) {

      voted[_voter][_reviewer] = true;
      
      if (_is_upvote){
        allReviews[mappingByReviewer[_reviewer] - 1].upvote += 1;
        allReviews[mappingByReviewer[_reviewer] - 1].authenticity += (credibility + 1);
      }
      else{
        allReviews[mappingByReviewer[_reviewer] - 1].downvote += 1;
        allReviews[mappingByReviewer[_reviewer] - 1].authenticity -= (credibility + 1);
      }
      allReviews[mappingByReviewer[_reviewer] - 1].impact += (credibility + 1);

    LogVoteAdded(_voter, _reviewer, _is_upvote);
  }
     
}

contract StoreRegistry{
  mapping (bytes32 => address) public registry;
  address public escrowAddress;

  event LogStoreCreated(address indexed store_address);

  function StoreRegistry(){
    Escrow escrow = new Escrow(this);
    escrowAddress = address(escrow);
  }

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

contract Escrow{
  mapping (address => uint256) public credibility;
  // credibility range is (0,1000)
  ActiveReview[] public allActiveReviews;
  address public storeRegistry;

  struct ActiveReview{
    address store;
    address reviewer;
    uint256 deposit;
    uint256 blockstamp;
  }

  function Escrow(address _registry) public {
    storeRegistry = _registry;
  }

  function review(address _store, address _reviewer, string _comment, uint256 _score)
    public
    payable {
      Store store = Store(_store);
      if (store.mappingByReviewer(_reviewer) == 0){
        if (msg.value >= 10000000000000000){
          ActiveReview memory activeReview;
          activeReview.store = _store;
          activeReview.reviewer = _reviewer;
          activeReview.deposit = msg.value;
          activeReview.blockstamp = block.timestamp;
          allActiveReviews.push(activeReview);
          store.addReview(_comment, _score, _reviewer);
        }
      } else {
        store.addReview(_comment, _score, _reviewer);
      }
  }

  function vote(address _store, address _voter, address _reviewer, bool _is_upvote) public {
    Store store = Store(_store);
    store.voteReview(_voter, _reviewer, _is_upvote, credibility[_voter]);
  }

  function settle() public {
    for (uint256 i = 0; i < allActiveReviews.length; i++){
      // loop through all active reviews and settle timeout ones
      if (block.timestamp - allActiveReviews[i].blockstamp >= 10){
        Store store = Store(allActiveReviews[i].store);
        uint256 amount;
        bool sign;
        (sign, amount) = store.settleReview(allActiveReviews[i].reviewer);
        if (sign){
          allActiveReviews[i].reviewer.transfer(allActiveReviews[i].deposit + 100000000000000 + amount * 10000000000);
          credibility[allActiveReviews[i].reviewer] = (credibility[allActiveReviews[i].reviewer] * 90 + 10000)/100;
        } else {
          credibility[allActiveReviews[i].reviewer] = (credibility[allActiveReviews[i].reviewer] * 90 + 0)/100;
        }
        // delete settled review
        allActiveReviews[i] = allActiveReviews[allActiveReviews.length - 1];
        delete allActiveReviews[allActiveReviews.length - 1];
      }
    }
  }
}