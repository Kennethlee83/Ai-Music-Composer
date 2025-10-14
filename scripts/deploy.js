const hre = require("hardhat");
require("dotenv").config({ path: '.env.local' });

async function main() {
  console.log("🚀 Deploying WeAD Music Platform contracts...");
  
  const network = await hre.ethers.provider.getNetwork();
  console.log("Network:", network.name, "Chain ID:", network.chainId.toString());

  // Chainlink Price Feed Addresses
  const PRICE_FEEDS = {
    84532: "0x4aDC67696bA383F43DD60A9e78F2C97Fbbfc7cb1", // Base Sepolia ETH/USD
    8453: "0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70",  // Base Mainnet ETH/USD
  };

  const chainId = Number(network.chainId);
  const priceFeedAddress = PRICE_FEEDS[chainId];

  if (!priceFeedAddress) {
    console.error("❌ No Chainlink price feed for this network!");
    process.exit(1);
  }

  console.log("📊 Using Chainlink ETH/USD Price Feed:", priceFeedAddress);

  // Deploy Mock USDC for testnet (or use real USDC for mainnet)
  let usdcAddress;
  if (chainId === 8453) {
    // Base Mainnet - Use real USDC
    usdcAddress = "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913";
    console.log("💵 Using Real USDC (Base Mainnet):", usdcAddress);
  } else {
    // Deploy Mock USDC for testnet
    console.log("\n💵 Deploying Mock USDC for testing...");
    const MockUSDC = await hre.ethers.getContractFactory("WeADToken"); // Reusing ERC20 for mock USDC
    const mockUSDC = await MockUSDC.deploy();
    await mockUSDC.waitForDeployment();
    usdcAddress = await mockUSDC.getAddress();
    console.log("✅ Mock USDC deployed to:", usdcAddress);
  }

  // Deploy WeAD Token
  console.log("\n🪙 Deploying WeAD Token...");
  const WeADToken = await hre.ethers.getContractFactory("WeADToken");
  const weadToken = await WeADToken.deploy();
  await weadToken.waitForDeployment();
  const weadTokenAddress = await weadToken.getAddress();
  console.log("✅ WeAD Token deployed to:", weadTokenAddress);

  // Deploy MusicPayment Contract
  console.log("\n💳 Deploying MusicPayment Contract...");
  const MusicPayment = await hre.ethers.getContractFactory("MusicPayment");
  const musicPayment = await MusicPayment.deploy(
    usdcAddress,
    weadTokenAddress,
    priceFeedAddress
  );
  await musicPayment.waitForDeployment();
  const musicPaymentAddress = await musicPayment.getAddress();
  console.log("✅ MusicPayment deployed to:", musicPaymentAddress);

  console.log("\n=== ✨ Deployment Summary ===");
  console.log("Network:", network.name);
  console.log("Chain ID:", chainId);
  console.log("USDC Address:", usdcAddress);
  console.log("WeAD Token Address:", weadTokenAddress);
  console.log("MusicPayment Address:", musicPaymentAddress);
  console.log("Chainlink Price Feed:", priceFeedAddress);

  console.log("\n📝 Copy these to your .env.local file:");
  console.log(`NEXT_PUBLIC_CHAIN_ID=${chainId}`);
  console.log(`NEXT_PUBLIC_USDC_ADDRESS=${usdcAddress}`);
  console.log(`NEXT_PUBLIC_WEAD_TOKEN_ADDRESS=${weadTokenAddress}`);
  console.log(`NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS=${musicPaymentAddress}`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });


