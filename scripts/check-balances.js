const { ethers } = require("hardhat");

async function main() {
  console.log("🔍 Checking WEAD Token Balances...\n");
  
  // Get the deployed contract addresses
  const weadTokenAddress = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  const musicNftAddress = "0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512";
  
  // Get the contract instances
  const WeADToken = await ethers.getContractAt("WeADToken", weadTokenAddress);
  const MusicNFT = await ethers.getContractAt("MusicNFT", musicNftAddress);
  
  // Get the contract owner
  const [owner] = await ethers.getSigners();
  console.log("📋 Contract Owner:", owner.address);
  console.log("💰 WEAD Token Contract:", weadTokenAddress);
  console.log("🎵 Music NFT Contract:", musicNftAddress);
  console.log("");
  
  // Check balances
  const contractBalance = await WeADToken.balanceOf(weadTokenAddress);
  const ownerBalance = await WeADToken.balanceOf(owner.address);
  
  console.log("💼 Contract Balance (collected fees):", ethers.formatEther(contractBalance), "WEAD");
  console.log("👤 Owner Balance:", ethers.formatEther(ownerBalance), "WEAD");
  console.log("");
  
  // Check total supply
  const totalSupply = await WeADToken.totalSupply();
  console.log("📊 Total WEAD Supply:", ethers.formatEther(totalSupply), "WEAD");
  
  // Check generation cost
  const generationCost = await WeADToken.GENERATION_COST();
  console.log("🎵 Music Generation Cost:", ethers.formatEther(generationCost), "WEAD");
  console.log("");
  
  console.log("💡 Where do the tokens go?");
  console.log("   • User pays 10 WEAD → Contract holds them");
  console.log("   • Contract owner can withdraw via withdrawFees()");
  console.log("   • This creates platform revenue!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


