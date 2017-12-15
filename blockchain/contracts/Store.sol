pragma solidity ^0.4.17;

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
        allReviews[reviewIndexPlusOneByReviewer[_reviewer] - 1].negative_impact += (_credibility+100);
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
