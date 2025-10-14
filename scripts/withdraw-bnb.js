const hre = require("hardhat");

async function main() {
  console.log("💰 Withdrawing BNB from MusicPayment contract...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`👤 Your wallet: ${deployer.address}`);

  const musicPaymentAddress = process.env.NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS;
  if (!musicPaymentAddress) {
    console.error("NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS is not set in .env.local");
    return;
  }

  console.log(`📍 Payment contract: ${musicPaymentAddress}\n`);

  // Check contract balance
  const contractBalance = await hre.ethers.provider.getBalance(musicPaymentAddress);
  const contractBalanceInBNB = hre.ethers.formatEther(contractBalance);
  console.log(`📊 Contract balance: ${contractBalanceInBNB} BNB`);

  if (parseFloat(contractBalanceInBNB) === 0) {
    console.log("⚠️ No BNB in the contract to withdraw!");
    return;
  }

  // Check your wallet balance before
  const balanceBefore = await hre.ethers.provider.getBalance(deployer.address);
  const balanceBeforeInBNB = hre.ethers.formatEther(balanceBefore);
  console.log(`💼 Your balance before: ${balanceBeforeInBNB} BNB\n`);

  const MusicPayment = await hre.ethers.getContractFactory("MusicPayment");
  const musicPayment = MusicPayment.attach(musicPaymentAddress);

  // Withdraw all BNB
  console.log("🚀 Withdrawing BNB...");
  const tx = await musicPayment.connect(deployer).withdrawETH(
    contractBalance
  );
  
  console.log(`📝 Transaction hash: ${tx.hash}`);
  console.log("⏳ Waiting for confirmation...");
  
  const receipt = await tx.wait();
  console.log("✅ BNB withdrawn successfully!\n");

  // Check your wallet balance after
  const balanceAfter = await hre.ethers.provider.getBalance(deployer.address);
  const balanceAfterInBNB = hre.ethers.formatEther(balanceAfter);
  console.log(`💼 Your balance after: ${balanceAfterInBNB} BNB`);

  const profit = parseFloat(balanceAfterInBNB) - parseFloat(balanceBeforeInBNB);
  console.log(`💰 Net gain (minus gas): ${profit.toFixed(6)} BNB`);
  console.log(`\n🎉 ${contractBalanceInBNB} BNB returned to your wallet!`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });

