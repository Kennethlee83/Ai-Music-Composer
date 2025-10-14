const hre = require("hardhat");

async function main() {
  console.log("💰 Funding MusicPayment contract with BNB...");

  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("📝 Sending from account:", deployerAddress);

  const balance = await hre.ethers.provider.getBalance(deployerAddress);
  console.log("💰 Your balance:", hre.ethers.formatEther(balance), "BNB");

  const contractAddress = "0x7C38b667888661bE70267E2b90CeE75029384B02";
  const amountToSend = hre.ethers.parseEther("0.01"); // 0.01 BNB

  console.log("\n📤 Sending 0.01 BNB to contract...");
  console.log("To:", contractAddress);

  const tx = await deployer.sendTransaction({
    to: contractAddress,
    value: amountToSend
  });

  console.log("⏳ Transaction sent:", tx.hash);
  console.log("Waiting for confirmation...");

  await tx.wait();

  const contractBalance = await hre.ethers.provider.getBalance(contractAddress);
  console.log("\n✅ Transaction confirmed!");
  console.log("📊 Contract balance:", hre.ethers.formatEther(contractBalance), "BNB");
  
  console.log("\n🔗 View on BSCScan:");
  console.log(`https://bscscan.com/tx/${tx.hash}`);
  console.log("\n✨ Contract funded successfully! Try buying credits now.");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });




