pragma solidity ^0.4.17;

contract Lottery {
    address public manager;
    address[] public players;
    
    function Lottery() public {
        // assign the deployers address as the manager of the lottery
        manager = msg.sender;
    }
    
    function enter() public payable {
        // player is required to pay 0.1 or greater to join the lottery
        require(msg.value >= 0.01 ether, 'Send at least the minimum amount of ether');
        
        // store player address
        players.push(msg.sender);
    }
    
    function getPlayers() public view returns(address[]) {
        return players;
    }
    
    function random() private view returns (uint) {
        // Hashing the (block.difficulty,now, players)
        return uint(keccak256(block.difficulty,now, players));
    }
        
    function pickWinner() public restricted {
        require(players.length > 0, 'Need at least one player');
        // randomly pick the index of the winner in the players array
        uint index = random() % players.length;
        
        // transfer contract's balance to the winner using the index
        players[index].transfer(this.balance);
        
        // reset lottery
        players = new address[](0);
    }
    
    modifier restricted() {
        // only the manager(the one who deployed the contract) should be able to execute the function
        require(msg.sender == manager, 'Anauthorized access');
        
        // will take the block-of-code of the restricted modifier caller, and replace <_> with it
        _;
    }
}