// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import "@openzeppelin/contracts/access/Ownable.sol";

contract MusicNFT is ERC721, Ownable {
    uint256 private _nextTokenId;
    uint256 public constant MAX_SUPPLY = 10000;
    
    struct MusicData {
        string style;
        string title;
        string lyrics;
        bool instrumental;
        string ipfsHash;
        string audioUrl;
        uint256 timestamp;
        address composer;
    }
    
    mapping(uint256 => MusicData) public musicData;
    mapping(address => uint256[]) public userMusic;
    
    event MusicMinted(
        uint256 indexed tokenId,
        address indexed composer,
        string style,
        string title,
        string ipfsHash
    );
    
    constructor() ERC721("WeAD Music NFT", "WEADMUSIC") Ownable(msg.sender) {}
    
    function mintMusic(
        address to,
        string memory style,
        string memory title,
        string memory lyrics,
        bool instrumental,
        string memory ipfsHash,
        string memory audioUrl,
        string memory /* tokenURI */
    ) external onlyOwner returns (uint256) {
        require(_nextTokenId < MAX_SUPPLY, "Max supply reached");
        
        uint256 tokenId = _nextTokenId++;
        _safeMint(to, tokenId);
        
        musicData[tokenId] = MusicData({
            style: style,
            title: title,
            lyrics: lyrics,
            instrumental: instrumental,
            ipfsHash: ipfsHash,
            audioUrl: audioUrl,
            timestamp: block.timestamp,
            composer: to
        });
        
        userMusic[to].push(tokenId);
        
        emit MusicMinted(tokenId, to, style, title, ipfsHash);
        return tokenId;
    }
    
    function getUserMusic(address user) external view returns (uint256[] memory) {
        return userMusic[user];
    }
    
    function getMusicData(uint256 tokenId) external view returns (MusicData memory) {
        return musicData[tokenId];
    }
}