// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract WeADToken is ERC20, Ownable {
    uint256 public constant GENERATION_COST = 10 * 10**18; // 10 WEAD tokens
    uint256 public constant MAX_SUPPLY = 1000000 * 10**18; // 1M tokens
    
    mapping(address => uint256) public lastGenerationTime;
    uint256 public constant GENERATION_COOLDOWN = 24 hours;
    
    event MusicGenerationPaid(address indexed user, uint256 amount, string style, string title);
    
    constructor() ERC20("WeAD Music Token", "WEAD") Ownable(msg.sender) {
        _mint(msg.sender, 100000 * 10**18); // Initial supply for distribution
    }
    
    function mint(address to, uint256 amount) external onlyOwner {
        require(totalSupply() + amount <= MAX_SUPPLY, "Max supply exceeded");
        _mint(to, amount);
    }
    
    function payForMusicGeneration(string memory style, string memory title) external {
        require(balanceOf(msg.sender) >= GENERATION_COST, "Insufficient WEAD tokens");
        require(
            block.timestamp >= lastGenerationTime[msg.sender] + GENERATION_COOLDOWN,
            "Generation cooldown not met"
        );
        
        _transfer(msg.sender, address(this), GENERATION_COST);
        lastGenerationTime[msg.sender] = block.timestamp;
        
        emit MusicGenerationPaid(msg.sender, GENERATION_COST, style, title);
    }
    
    function withdrawFees() external onlyOwner {
        uint256 balance = balanceOf(address(this));
        _transfer(address(this), owner(), balance);
    }
}