const hre = require("hardhat");

async function main() {
  console.log("📊 Checking credits on blockchain...\n");

  const userAddress = "0x01d3829a1b0CA3E1390724a0C5C419435720431e";
  const musicPaymentAddress = process.env.NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS;
  
  console.log(`👤 User: ${userAddress}`);
  console.log(`📍 Contract: ${musicPaymentAddress}\n`);

  const MusicPayment = await hre.ethers.getContractFactory("MusicPayment");
  const musicPayment = MusicPayment.attach(musicPaymentAddress);

  const credits = await musicPayment.userCredits(userAddress);
  console.log(`✅ Current credits: ${credits.toString()}`);
  console.log(`🎵 Songs available: ${(Number(credits) * 2)}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });




