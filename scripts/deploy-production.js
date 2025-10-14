const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying WeAD Music Platform to Base Mainnet...");
  console.log("⚠️  This will cost REAL ETH!");
  
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deploying with account:", deployer.address);
  
  const balance = await hre.ethers.provider.getBalance(deployer.address);
  console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (balance < hre.ethers.parseEther("0.01")) {
    console.error("❌ Insufficient ETH! You need at least 0.01 ETH for deployment.");
    process.exit(1);
  }

  console.log("\n📝 Step 1: Deploying WeAD Token...");
  const WeADToken = await hre.ethers.getContractFactory("WeADToken");
  const weadToken = await WeADToken.deploy();
  await weadToken.waitForDeployment();
  const weadTokenAddress = await weadToken.getAddress();
  console.log("✅ WeAD Token deployed to:", weadTokenAddress);

  // USDC on Base Mainnet (official contract)
  const USDC_MAINNET = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
  console.log("\n💵 Using official USDC on Base Mainnet:", USDC_MAINNET);

  console.log("\n📝 Step 2: Deploying MusicPayment Contract...");
  const MusicPayment = await hre.ethers.getContractFactory("MusicPayment");
  const musicPayment = await MusicPayment.deploy(USDC_MAINNET, weadTokenAddress);
  await musicPayment.waitForDeployment();
  const musicPaymentAddress = await musicPayment.getAddress();
  console.log("✅ MusicPayment deployed to:", musicPaymentAddress);

  console.log("\n" + "=".repeat(60));
  console.log("🎉 DEPLOYMENT SUCCESSFUL!");
  console.log("=".repeat(60));
  console.log("\n📋 Contract Addresses (Base Mainnet):");
  console.log("─".repeat(60));
  console.log("WeAD Token:      ", weadTokenAddress);
  console.log("USDC:            ", USDC_MAINNET);
  console.log("MusicPayment:    ", musicPaymentAddress);
  console.log("─".repeat(60));

  console.log("\n📝 Update your .env.local with these addresses:");
  console.log("─".repeat(60));
  console.log(`NEXT_PUBLIC_CHAIN_ID=8453`);
  console.log(`NEXT_PUBLIC_RPC_URL=https://mainnet.base.org`);
  console.log(`NEXT_PUBLIC_WEAD_TOKEN_ADDRESS=${weadTokenAddress}`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${USDC_MAINNET}`);
  console.log(`NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS=${musicPaymentAddress}`);
  console.log("─".repeat(60));

  console.log("\n🔗 View on BaseScan:");
  console.log(`WeAD Token:    https://basescan.org/address/${weadTokenAddress}`);
  console.log(`MusicPayment:  https://basescan.org/address/${musicPaymentAddress}`);

  console.log("\n✅ Next Steps:");
  console.log("1. Update .env.local with the addresses above");
  console.log("2. Restart your development server");
  console.log("3. Test with REAL USDC on Base Mainnet");
  console.log("4. Deploy frontend to production (Vercel)");
  
  console.log("\n⚠️  IMPORTANT:");
  console.log("- You are now the owner of these contracts");
  console.log("- Only you can withdraw funds from MusicPayment");
  console.log("- Keep your private key SAFE and SECURE!");
  console.log("- Users will pay REAL USDC for music generation");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });



