const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying MusicPayment contract to", hre.network.name);

  // Get the deployer
  const [deployer] = await hre.ethers.getSigners();
  const deployerAddress = await deployer.getAddress();
  console.log("📝 Deploying contracts with account:", deployerAddress);

  const balance = await hre.ethers.provider.getBalance(deployerAddress);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");

  // USDC addresses on different networks
  const USDC_ADDRESSES = {
    // Base Mainnet
    base: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
    // Base Sepolia Testnet
    baseSepolia: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
    // BSC Mainnet
    bsc: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
    // BSC Testnet
    bscTestnet: "0x64544969ed7EBf5f083679233325356EbE738930",
    // Ethereum Sepolia (for testing)
    sepolia: "0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238",
    // Local development (deploy mock USDC)
    localhost: null,
    hardhat: null,
  };

  // Chainlink BNB/USD Price Feed addresses
  const PRICE_FEED_ADDRESSES = {
    // Base Mainnet (ETH/USD)
    base: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",
    // Base Sepolia (ETH/USD)
    baseSepolia: "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1",
    // BSC Mainnet (BNB/USD)
    bsc: "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE",
    // BSC Testnet (BNB/USD)
    bscTestnet: "0x2514895c72f50D8bd4B4F9b1110F0D6bD2c97526",
    // Ethereum Sepolia (ETH/USD)
    sepolia: "0x694AA1769357215DE4FAC081bf1f309aDC325306",
    // Local development (will deploy mock)
    localhost: null,
    hardhat: null,
  };

  let usdcAddress = USDC_ADDRESSES[hre.network.name];
  let priceFeedAddress = PRICE_FEED_ADDRESSES[hre.network.name];
  let weadTokenAddress = process.env.NEXT_PUBLIC_WEAD_TOKEN_ADDRESS;

  // For local development, deploy mock tokens
  if (!usdcAddress) {
    console.log("📦 Deploying mock USDC token for local testing...");
    const MockUSDC = await hre.ethers.getContractFactory("WeADToken");
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    usdcAddress = await mockUSDC.getAddress();
    console.log("✅ Mock USDC deployed to:", usdcAddress);
  }

  if (!weadTokenAddress) {
    console.log("📦 Deploying WeAD Token...");
    const WeADToken = await hre.ethers.getContractFactory("WeADToken");
    const weadToken = await WeADToken.deploy();
    await weadToken.waitForDeployment();
    weadTokenAddress = await weadToken.getAddress();
    console.log("✅ WeAD Token deployed to:", weadTokenAddress);
  }

  console.log("\n📋 Using:");
  console.log("  USDC:", usdcAddress);
  console.log("  WEAD:", weadTokenAddress);
  console.log("  Price Feed:", priceFeedAddress);

  // Deploy MusicPayment contract
  console.log("\n📦 Deploying MusicPayment contract...");
  const MusicPayment = await hre.ethers.getContractFactory("MusicPayment");
  const musicPayment = await MusicPayment.deploy(usdcAddress, weadTokenAddress);
  await musicPayment.waitForDeployment();

  const musicPaymentAddress = await musicPayment.getAddress();
  console.log("✅ MusicPayment deployed to:", musicPaymentAddress);

  // Print deployment summary
  console.log("\n📋 Deployment Summary:");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("Network:", hre.network.name);
  console.log("Chain ID:", (await hre.ethers.provider.getNetwork()).chainId);
  console.log("MusicPayment:", musicPaymentAddress);
  console.log("USDC Token:", usdcAddress);
  console.log("WeAD Token:", weadTokenAddress);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

  // Update .env file instructions
  console.log("\n📝 Add these to your .env.local file:");
  console.log(`NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS=${musicPaymentAddress}`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${usdcAddress}`);
  console.log(`NEXT_PUBLIC_WEAD_TOKEN_ADDRESS=${weadTokenAddress}`);
  console.log(`NEXT_PUBLIC_CHAIN_ID=${(await hre.ethers.provider.getNetwork()).chainId}`);

  // Verify on block explorer
  if (hre.network.name === "base" || hre.network.name === "baseSepolia" || hre.network.name === "bsc" || hre.network.name === "bscTestnet") {
    console.log("\n⏳ Waiting 30 seconds before verification...");
    await new Promise((resolve) => setTimeout(resolve, 30000));

    try {
      const explorerName = hre.network.name.includes("bsc") ? "BSCScan" : "Basescan";
      console.log(`🔍 Verifying contract on ${explorerName}...`);
      await hre.run("verify:verify", {
        address: musicPaymentAddress,
        constructorArguments: [usdcAddress, weadTokenAddress],
      });
      console.log("✅ Contract verified successfully!");
    } catch (error) {
      console.log("⚠️ Verification failed:", error.message);
    }
  }

  console.log("\n✨ Deployment complete!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
