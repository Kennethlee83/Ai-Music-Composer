const hre = require("hardhat");

async function main() {
  console.log("🎁 Adding test credits...");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`\n👤 Admin wallet: ${deployer.address}`);

  const userAddress = "0x01d3829a1b0CA3E1390724a0C5C419435720431e"; // User's wallet
  const creditsToAdd = 2;

  const musicPaymentAddress = process.env.NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS;
  if (!musicPaymentAddress) {
    console.error("NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS is not set in .env.local");
    return;
  }

  console.log(`📍 Payment contract: ${musicPaymentAddress}`);

  const MusicPayment = await hre.ethers.getContractFactory("MusicPayment");
  const musicPayment = MusicPayment.attach(musicPaymentAddress);

  // Check current credits
  const currentCredits = await musicPayment.userCredits(userAddress);
  console.log(`📊 Current credits for ${userAddress}: ${currentCredits}`);

  // Add test credits
  console.log(`\n🚀 Adding ${creditsToAdd} credits...`);
  const tx = await musicPayment.connect(deployer).addTestCredits(userAddress, creditsToAdd);
  await tx.wait();
  console.log(`✅ Credits added successfully!`);
  console.log(`📝 Transaction: ${tx.hash}`);

  // Check new balance
  const newCredits = await musicPayment.userCredits(userAddress);
  console.log(`\n📊 New credits for ${userAddress}: ${newCredits}`);
  console.log(`💎 That's ${newCredits} credits = ${newCredits * 2} songs!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });




