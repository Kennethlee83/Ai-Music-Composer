const hre = require("hardhat");

async function main() {
  console.log("🧪 Testing MusicPayment Contract Calls...\n");

  const contractAddress = "0x7C38b667888661bE70267E2b90CeE75029384B02";
  
  const contractABI = [
    "function getRequiredETH() external view returns (uint256)",
    "function musicGenerationPrice() external view returns (uint256)",
    "function usdPriceInCents() external view returns (uint256)",
    "function userCredits(address user) external view returns (uint256)",
    "function buyCreditsWithETH(uint256 quantity) external payable"
  ];

  const [signer] = await hre.ethers.getSigners();
  const signerAddress = await signer.getAddress();
  const contract = await hre.ethers.getContractAt(contractABI, contractAddress);

  try {
    console.log("1️⃣ Testing getRequiredETH()...");
    const requiredETH = await contract.getRequiredETH();
    console.log("✅ Required ETH:", hre.ethers.formatEther(requiredETH), "BNB");
    console.log("   (This is", (0.10 / parseFloat(hre.ethers.formatEther(requiredETH))).toFixed(2), "BNB/USD)");
  } catch (error) {
    console.log("❌ getRequiredETH() failed:", error.message);
  }

  try {
    console.log("\n2️⃣ Testing musicGenerationPrice()...");
    const price = await contract.musicGenerationPrice();
    console.log("✅ Music Generation Price:", price.toString(), "($0." + (Number(price)/10000).toString().padStart(2, '0') + ")");
  } catch (error) {
    console.log("❌ musicGenerationPrice() failed:", error.message);
  }

  try {
    console.log("\n3️⃣ Testing usdPriceInCents()...");
    const cents = await contract.usdPriceInCents();
    console.log("✅ USD Price in Cents:", cents.toString(), "cents");
  } catch (error) {
    console.log("❌ usdPriceInCents() failed:", error.message);
  }

  try {
    console.log("\n4️⃣ Testing userCredits()...");
    const credits = await contract.userCredits(signerAddress);
    console.log("✅ Your Credits:", credits.toString());
  } catch (error) {
    console.log("❌ userCredits() failed:", error.message);
  }

  try {
    console.log("\n5️⃣ Testing buyCreditsWithETH() [DRY RUN]...");
    const requiredETH = await contract.getRequiredETH();
    const totalRequired = requiredETH; // For 1 credit
    
    console.log("   Estimating gas for buying 1 credit...");
    console.log("   Amount to send:", hre.ethers.formatEther(totalRequired), "BNB");
    
    const gasEstimate = await contract.buyCreditsWithETH.estimateGas(1, {
      value: totalRequired
    });
    console.log("✅ Gas estimate:", gasEstimate.toString());
    console.log("✅ Transaction should work!");
    
  } catch (error) {
    console.log("❌ buyCreditsWithETH() would fail:", error.shortMessage || error.message);
    if (error.data) {
      console.log("   Revert data:", error.data);
    }
  }

  console.log("\n" + "=".repeat(50));
  console.log("📊 Summary:");
  console.log("Contract:", contractAddress);
  console.log("Your address:", signerAddress);
  console.log("=".repeat(50));
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });




