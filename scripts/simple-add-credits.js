const hre = require("hardhat");

async function main() {
  console.log("🎁 Adding 2 test credits via simple method...");

  const userAddress = "0x01d3829a1b0CA3E1390724a0C5C419435720431e";
  const musicPaymentAddress = "0xf90d46a19bF1Aa2fD938FC7D76Bb534C85c271D7";

  const [signer] = await hre.ethers.getSigners();
  console.log(`👤 Signer: ${signer.address}`);

  // Simple ABI with just the function we need
  const abi = [
    "function userCredits(address) view returns (uint256)",
    "function addTestCredits(address user, uint256 amount) external"
  ];

  const contract = new hre.ethers.Contract(musicPaymentAddress, abi, signer);

  // Check current balance
  try {
    const currentBalance = await contract.userCredits(userAddress);
    console.log(`📊 Current balance: ${currentBalance} credits`);
  } catch (e) {
    console.log("Could not read balance:", e.message);
  }

  // Try to add credits
  try {
    console.log(`\n🚀 Adding 2 credits to ${userAddress}...`);
    
    // Add extra gas limit
    const tx = await contract.addTestCredits(userAddress, 2, {
      gasLimit: 200000
    });
    
    console.log(`⏳ Transaction sent: ${tx.hash}`);
    const receipt = await tx.wait();
    console.log(`✅ Transaction confirmed in block ${receipt.blockNumber}`);
    
    // Check new balance
    const newBalance = await contract.userCredits(userAddress);
    console.log(`\n📊 New balance: ${newBalance} credits`);
    console.log(`💎 That's ${newBalance * 2} songs!`);
  } catch (error) {
    console.error("\n❌ Error adding credits:");
    console.error(error.message);
    
    // Check if function exists
    console.log("\n🔍 Checking if addTestCredits function exists...");
    try {
      const code = await hre.ethers.provider.getCode(musicPaymentAddress);
      console.log(`Contract bytecode length: ${code.length} characters`);
      
      // Try to estimate gas
      try {
        const estimate = await contract.addTestCredits.estimateGas(userAddress, 2);
        console.log(`Gas estimate: ${estimate}`);
      } catch (gasError) {
        console.log(`Gas estimation failed: ${gasError.shortMessage || gasError.message}`);
      }
    } catch (e) {
      console.log("Could not check contract:", e.message);
    }
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });




