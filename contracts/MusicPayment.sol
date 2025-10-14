// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

/**
 * @title MusicPayment
 * @dev Handles payments for music generation using BNB, USDC or WeAD tokens
 * Uses simple manual BNB price that owner can update
 */
contract MusicPayment is Ownable {
    // Payment configuration
    uint256 public musicGenerationPrice = 100000; // $0.10 in USDC (6 decimals)
    uint256 public usdPriceInCents = 10; // $0.10 = 10 cents
    
    // Manual BNB/USD price (stored with 8 decimals, e.g., 127000000000 = $1270.00)
    uint256 public bnbPriceUSD = 127000000000; // Default: $1270.00
    
    // Supported payment tokens
    IERC20 public usdcToken;
    IERC20 public weadToken;
    
    // Track music generation payments
    struct MusicGeneration {
        address user;
        string title;
        string style;
        uint256 timestamp;
        address paymentToken;
        uint256 amountPaid;
    }
    
    mapping(address => MusicGeneration[]) public userGenerations;
    mapping(address => uint256) public totalGenerations;
    
    // Track user credits (number of songs they can generate)
    mapping(address => uint256) public userCredits;
    
    // Track if user has claimed their free welcome credit
    mapping(address => bool) public hasClaimedWelcomeCredit;
    
    // Events
    event MusicPaid(
        address indexed user,
        string title,
        string style,
        address paymentToken,
        uint256 amount,
        uint256 timestamp
    );
    
    event CreditsPurchased(
        address indexed user,
        uint256 quantity,
        address paymentToken,
        uint256 totalAmount,
        uint256 timestamp
    );
    
    event CreditUsed(
        address indexed user,
        string title,
        uint256 remainingCredits
    );
    
    event WelcomeCreditClaimed(
        address indexed user,
        uint256 timestamp
    );
    
    event CreditRefunded(
        address indexed user,
        uint256 amount,
        string reason,
        uint256 timestamp
    );
    
    event PriceUpdated(uint256 newPrice);
    event EthPriceUpdated(uint256 newPrice);
    event TokensWithdrawn(address token, uint256 amount, address to);
    event EthWithdrawn(uint256 amount, address to);
    
    constructor(
        address _usdcToken, 
        address _weadToken
    ) Ownable(msg.sender) {
        usdcToken = IERC20(_usdcToken);
        weadToken = IERC20(_weadToken);
    }
    
    /**
     * @dev Update BNB/USD price (owner or automated keeper)
     * @param newPrice BNB price in USD with 8 decimals
     */
    function updateBNBPrice(uint256 newPrice) external onlyOwner {
        require(newPrice > 0, "Invalid price");
        require(newPrice >= 100 * 10**8 && newPrice <= 100000 * 10**8, "Price out of range");
        bnbPriceUSD = newPrice;
        emit BNBPriceUpdated(newPrice);
    }
    
    /**
     * @dev Calculate required BNB amount for $0.10 payment
     * @return bnbAmount Required BNB in wei
     */
    function getRequiredETH() public view returns (uint256) {
        require(bnbPriceUSD > 0, "BNB price not set");
        
        // Calculate: (usdPriceInCents * 1e18 * 1e8) / (bnbPriceUSD * 100)
        uint256 requiredWei = (usdPriceInCents * 1e18 * 1e8) / (bnbPriceUSD * 100);
        return requiredWei;
    }
    
    event BNBPriceUpdated(uint256 newPrice);
    
    /**
     * @dev Buy credits with USDC (purchase multiple songs at once)
     * @param quantity Number of song credits to purchase
     */
    function buyCreditsWithUSDC(uint256 quantity) external {
        require(quantity > 0, "Quantity must be greater than 0");
        
        uint256 totalRequired = musicGenerationPrice * quantity;
        
        require(
            usdcToken.balanceOf(msg.sender) >= totalRequired,
            "Insufficient USDC balance"
        );
        
        // Transfer USDC from user to contract
        require(
            usdcToken.transferFrom(msg.sender, address(this), totalRequired),
            "USDC transfer failed"
        );
        
        // Add credits to user's balance
        userCredits[msg.sender] += quantity;
        
        emit CreditsPurchased(
            msg.sender,
            quantity,
            address(usdcToken),
            totalRequired,
            block.timestamp
        );
    }
    
    /**
     * @dev Pay for music generation with USDC (single payment, no credits)
     */
    function payWithUSDC(string memory title, string memory style) external {
        require(
            usdcToken.balanceOf(msg.sender) >= musicGenerationPrice,
            "Insufficient USDC balance"
        );
        
        // Transfer USDC from user to contract
        require(
            usdcToken.transferFrom(msg.sender, address(this), musicGenerationPrice),
            "USDC transfer failed"
        );
        
        _recordGeneration(msg.sender, title, style, address(usdcToken), musicGenerationPrice);
        
        emit MusicPaid(
            msg.sender,
            title,
            style,
            address(usdcToken),
            musicGenerationPrice,
            block.timestamp
        );
    }
    
    /**
     * @dev Buy credits with ETH (purchase multiple songs at once)
     * @param quantity Number of song credits to purchase
     * @notice Uses Checks-Effects-Interactions pattern to prevent reentrancy
     */
    function buyCreditsWithETH(uint256 quantity) external payable {
        // CHECKS
        require(quantity > 0, "Quantity must be greater than 0");
        
        uint256 requiredETHPerSong = getRequiredETH();
        uint256 totalRequired = requiredETHPerSong * quantity;
        
        require(msg.value >= totalRequired, "Insufficient ETH sent");
        
        // EFFECTS - Update state before external calls
        userCredits[msg.sender] += quantity;
        
        // Emit event before external calls
        emit CreditsPurchased(
            msg.sender,
            quantity,
            address(0), // ETH
            totalRequired,
            block.timestamp
        );
        
        // INTERACTIONS - External calls last to prevent reentrancy
        if (msg.value > totalRequired) {
            uint256 refundAmount = msg.value - totalRequired;
            (bool refundSuccess, ) = payable(msg.sender).call{value: refundAmount}("");
            require(refundSuccess, "ETH refund failed");
        }
    }
    
    /**
     * @dev Use one credit to generate music (no payment required if user has credits)
     */
    function useCredit(string memory title, string memory style) external {
        require(userCredits[msg.sender] > 0, "No credits available");
        
        userCredits[msg.sender] -= 1;
        
        _recordGeneration(msg.sender, title, style, address(0), 0);
        
        emit CreditUsed(msg.sender, title, userCredits[msg.sender]);
    }
    
    /**
     * @dev Pay for music generation with ETH (single payment, no credits)
     * @notice Uses Checks-Effects-Interactions pattern to prevent reentrancy
     */
    function payWithETH(string memory title, string memory style) external payable {
        // CHECKS
        uint256 requiredETH = getRequiredETH();
        require(msg.value >= requiredETH, "Insufficient ETH sent");
        
        // EFFECTS - Update state before external calls
        _recordGeneration(msg.sender, title, style, address(0), requiredETH);
        
        emit MusicPaid(
            msg.sender,
            title,
            style,
            address(0), // address(0) represents ETH
            requiredETH,
            block.timestamp
        );
        
        // INTERACTIONS - External calls last to prevent reentrancy
        if (msg.value > requiredETH) {
            uint256 refundAmount = msg.value - requiredETH;
            (bool refundSuccess, ) = payable(msg.sender).call{value: refundAmount}("");
            require(refundSuccess, "ETH refund failed");
        }
    }
    
    /**
     * @dev Pay for music generation with WeAD tokens
     */
    function payWithWeAD(string memory title, string memory style, uint256 weadAmount) external {
        require(
            weadToken.balanceOf(msg.sender) >= weadAmount,
            "Insufficient WeAD balance"
        );
        
        // Transfer WeAD tokens from user to contract
        require(
            weadToken.transferFrom(msg.sender, address(this), weadAmount),
            "WeAD transfer failed"
        );
        
        _recordGeneration(msg.sender, title, style, address(weadToken), weadAmount);
        
        emit MusicPaid(
            msg.sender,
            title,
            style,
            address(weadToken),
            weadAmount,
            block.timestamp
        );
    }
    
    /**
     * @dev Record music generation
     */
    function _recordGeneration(
        address user,
        string memory title,
        string memory style,
        address paymentToken,
        uint256 amount
    ) internal {
        userGenerations[user].push(MusicGeneration({
            user: user,
            title: title,
            style: style,
            timestamp: block.timestamp,
            paymentToken: paymentToken,
            amountPaid: amount
        }));
        
        totalGenerations[user]++;
    }
    
    /**
     * @dev Claim free welcome credit (1 credit per wallet, one-time only)
     */
    function claimWelcomeCredit() external {
        require(!hasClaimedWelcomeCredit[msg.sender], "Welcome credit already claimed");
        
        hasClaimedWelcomeCredit[msg.sender] = true;
        userCredits[msg.sender] += 1;
        
        emit WelcomeCreditClaimed(msg.sender, block.timestamp);
    }
    
    /**
     * @dev Add test credits to a user (owner only, for testing purposes)
     */
    function addTestCredits(address user, uint256 amount) external onlyOwner {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");
        
        userCredits[user] += amount;
        
        emit CreditsPurchased(
            user,
            amount,
            address(0), // No payment token (test credits)
            0, // No payment amount
            block.timestamp
        );
    }
    
    /**
     * @dev Refund credit to user (owner only, for failed generations)
     * @param user User address to refund
     * @param amount Number of credits to refund
     * @param reason Reason for refund (e.g., "Content policy violation")
     */
    function refundCredit(address user, uint256 amount, string memory reason) external onlyOwner {
        require(user != address(0), "Invalid user address");
        require(amount > 0, "Amount must be greater than 0");
        
        userCredits[user] += amount;
        
        emit CreditRefunded(
            user,
            amount,
            reason,
            block.timestamp
        );
    }
    
    /**
     * @dev Get user's generation history
     */
    function getUserGenerations(address user) external view returns (MusicGeneration[] memory) {
        return userGenerations[user];
    }
    
    /**
     * @dev Update music generation price (owner only)
     */
    function updatePrice(uint256 newPrice) external onlyOwner {
        musicGenerationPrice = newPrice;
        emit PriceUpdated(newPrice);
    }
    
    /**
     * @dev Update USD price in cents (owner only)
     */
    function updateUSDPrice(uint256 newPriceInCents) external onlyOwner {
        usdPriceInCents = newPriceInCents;
        emit PriceUpdated(newPriceInCents);
    }
    
    /**
     * @dev Withdraw collected ETH (owner only)
     */
    function withdrawETH(uint256 amount) external onlyOwner {
        require(address(this).balance >= amount, "Insufficient ETH balance");
        
        (bool success, ) = payable(owner()).call{value: amount}("");
        require(success, "ETH withdrawal failed");
        
        emit EthWithdrawn(amount, owner());
    }
    
    /**
     * @dev Withdraw collected fees (owner only)
     */
    function withdrawTokens(address token, uint256 amount) external onlyOwner {
        IERC20 tokenContract = IERC20(token);
        require(
            tokenContract.balanceOf(address(this)) >= amount,
            "Insufficient balance"
        );
        
        require(
            tokenContract.transfer(owner(), amount),
            "Token transfer failed"
        );
        
        emit TokensWithdrawn(token, amount, owner());
    }
    
    /**
     * @dev Update USDC token address (owner only)
     */
    function updateUSDCToken(address newUSDCToken) external onlyOwner {
        usdcToken = IERC20(newUSDCToken);
    }
    
    /**
     * @dev Update WeAD token address (owner only)
     */
    function updateWeADToken(address newWeADToken) external onlyOwner {
        weadToken = IERC20(newWeADToken);
    }
}
