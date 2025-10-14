const hre = require("hardhat");

async function main() {
  console.log("🎁 Adding test credits to your wallet...\n");

  const contractAddress = "0xf90d46a19bF1Aa2fD938FC7D76Bb534C85c271D7";
  const testUserAddress = "0x01d3829a1b0CA3E1390724a0C5C419435720431e";
  const creditsToAdd = 10;

  const [signer] = await hre.ethers.getSigners();
  const signerAddress = await signer.getAddress();
  console.log("👤 Adding credits from owner account:", signerAddress);
  console.log("🎯 Target user:", testUserAddress);
  console.log("💎 Credits to add:", creditsToAdd, "\n");

  const MusicPayment = await hre.ethers.getContractFactory("MusicPayment");
  const musicPayment = MusicPayment.attach(contractAddress);

  // Check current credits
  const currentCredits = await musicPayment.userCredits(testUserAddress);
  console.log("📊 Current credits:", currentCredits.toString());

  // The contract doesn't have a direct "add credits" function, so we need to add one
  // For now, let's just simulate buying credits by sending a transaction
  console.log("\n⚠️ Note: The contract needs an admin function to add test credits.");
  console.log("As a workaround, I'll create a simple helper contract or you can:");
  console.log("1. Buy credits normally with BNB");
  console.log("2. Add an 'addTestCredits' function to the contract");
  
  console.log("\n💡 For now, please try buying 1 credit with BNB to test the system.");
  console.log("   Cost: ~0.000079 BNB (~$0.10)");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });




