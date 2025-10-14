const hre = require("hardhat");

async function main() {
  console.log("💰 Checking BNB balance...\n");

  const [deployer] = await hre.ethers.getSigners();
  console.log(`👤 Wallet: ${deployer.address}`);

  const balance = await hre.ethers.provider.getBalance(deployer.address);
  const balanceInBNB = hre.ethers.formatEther(balance);
  
  console.log(`📊 Current balance: ${balanceInBNB} BNB`);
  
  const requiredForDeploy = 0.0066; // Estimated gas for deployment
  const currentBalance = parseFloat(balanceInBNB);
  
  if (currentBalance >= requiredForDeploy) {
    console.log(`\n✅ You have enough BNB to deploy!`);
    console.log(`   Required: ~${requiredForDeploy} BNB`);
    console.log(`   You have: ${balanceInBNB} BNB`);
  } else {
    const needed = requiredForDeploy - currentBalance;
    console.log(`\n⚠️ Need more BNB for deployment`);
    console.log(`   Required: ~${requiredForDeploy} BNB`);
    console.log(`   You have: ${balanceInBNB} BNB`);
    console.log(`   Need to add: ~${needed.toFixed(4)} BNB (~$${(needed * 1270).toFixed(2)})`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });




