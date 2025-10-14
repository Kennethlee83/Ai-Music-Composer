const hre = require("hardhat");

async function main() {
  console.log("🔍 Checking Chainlink BNB/USD Price Feed...\n");

  const priceFeedAddress = "0x0567F2323251f0Aab15c8dFb1967E4e8A7D42aeE";
  
  const priceFeedABI = [
    "function latestRoundData() external view returns (uint80 roundId, int256 answer, uint256 startedAt, uint256 updatedAt, uint80 answeredInRound)",
    "function decimals() external view returns (uint8)"
  ];

  const priceFeed = await hre.ethers.getContractAt(priceFeedABI, priceFeedAddress);

  try {
    console.log("📊 Fetching latest price data...");
    const decimals = await priceFeed.decimals();
    console.log("Decimals:", decimals);

    const roundData = await priceFeed.latestRoundData();
    const price = roundData.answer;
    const updatedAt = roundData.updatedAt;
    const roundId = roundData.roundId;
    const answeredInRound = roundData.answeredInRound;

    console.log("\n✅ Price Feed Data:");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Round ID:", roundId.toString());
    console.log("Price (raw):", price.toString());
    console.log("Price (USD):", "$" + (Number(price) / 10**Number(decimals)).toFixed(2));
    console.log("Updated At:", new Date(Number(updatedAt) * 1000).toLocaleString());
    console.log("Answered In Round:", answeredInRound.toString());
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");

    // Check if data is fresh
    const now = Math.floor(Date.now() / 1000);
    const age = now - Number(updatedAt);
    console.log("\n⏰ Data Age:", Math.floor(age / 60), "minutes");

    if (age > 3600) {
      console.log("⚠️ WARNING: Price data is more than 1 hour old!");
    } else {
      console.log("✅ Price data is fresh");
    }

    // Check price range (for BNB should be $300-$1000)
    const priceUSD = Number(price) / 10**Number(decimals);
    if (priceUSD < 100 || priceUSD > 2000) {
      console.log("⚠️ WARNING: Price outside expected range for BNB");
    } else {
      console.log("✅ Price is within reasonable range");
    }

    // Calculate required BNB for $0.10
    const requiredBNB = 0.10 / priceUSD;
    console.log("\n💰 For $0.10 payment:");
    console.log("Required BNB:", requiredBNB.toFixed(8));

  } catch (error) {
    console.error("❌ Error fetching price data:", error.message);
    console.log("\nThis explains why the contract is failing!");
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });




