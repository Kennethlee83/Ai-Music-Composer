const hre = require("hardhat");

async function main() {
  console.log("🎁 Claiming your free welcome credit...\n");

  const contractAddress = "0xf90d46a19bF1Aa2fD938FC7D76Bb534C85c271D7";

  const [signer] = await hre.ethers.getSigners();
  const signerAddress = await signer.getAddress();
  console.log("👤 Your wallet:", signerAddress);

  const MusicPayment = await hre.ethers.getContractFactory("MusicPayment");
  const musicPayment = MusicPayment.attach(contractAddress);

  // Check if already claimed
  const hasClaimed = await musicPayment.hasClaimedWelcomeCredit(signerAddress);
  console.log("Already claimed?", hasClaimed);

  if (hasClaimed) {
    console.log("\n⚠️ You've already claimed your free welcome credit!");
    
    // Check current credits
    const currentCredits = await musicPayment.userCredits(signerAddress);
    console.log("📊 Your current credits:", currentCredits.toString());
    return;
  }

  console.log("\n🎉 Claiming your free welcome credit...");
  const tx = await musicPayment.claimWelcomeCredit();
  console.log("⏳ Transaction sent:", tx.hash);
  
  await tx.wait();
  console.log("✅ Welcome credit claimed!");

  // Check new credits
  const newCredits = await musicPayment.userCredits(signerAddress);
  console.log("📊 Your new credits:", newCredits.toString());
  console.log("\n🎵 You can now generate 2 songs with your free credit!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });




