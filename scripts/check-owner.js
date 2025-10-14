const hre = require("hardhat");

async function main() {
  console.log("🔍 Checking contract owner...");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`\n👤 Current signer: ${deployer.address}`);

  const musicPaymentAddress = process.env.NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS;
  if (!musicPaymentAddress) {
    console.error("NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS is not set in .env.local");
    return;
  }

  console.log(`📍 Payment contract: ${musicPaymentAddress}`);

  const MusicPayment = await hre.ethers.getContractFactory("MusicPayment");
  const musicPayment = MusicPayment.attach(musicPaymentAddress);

  // Get owner
  const owner = await musicPayment.owner();
  console.log(`\n👑 Contract owner: ${owner}`);
  
  const isSame = owner.toLowerCase() === deployer.address.toLowerCase();
  console.log(`\n✅ Signer is owner: ${isSame}`);
  
  if (!isSame) {
    console.log(`\n⚠️ WARNING: Current signer (${deployer.address}) is NOT the owner (${owner})`);
    console.log(`You need to use the owner's private key to call owner-only functions.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });




