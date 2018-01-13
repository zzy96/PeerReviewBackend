pragma solidity ^0.4.17;
import './Store.sol';
import './Escrow.sol';

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
}
