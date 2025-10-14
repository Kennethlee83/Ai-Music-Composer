const hre = require("hardhat");
const axios = require("axios");

async function main() {
  console.log("🔄 Fetching live BNB price from CoinGecko...\n");

  try {
    // Fetch BNB price from CoinGecko API (free, no API key needed)
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd"
    );

    const bnbPriceUSD = response.data.binancecoin.usd;
    console.log(`💰 Current BNB Price: $${bnbPriceUSD.toFixed(2)}`);

    // Convert to contract format (8 decimals)
    // e.g., $1270.00 → 127000000000
    const bnbPriceScaled = Math.floor(bnbPriceUSD * 10 ** 8);
    console.log(`📊 Scaled Price (8 decimals): ${bnbPriceScaled}`);

    const contractAddress = process.env.NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS;
    if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
      console.log("⚠️ Contract address not set. Skipping update.");
      return;
    }

    const [signer] = await hre.ethers.getSigners();
    const signerAddress = await signer.getAddress();
    console.log(`\n👤 Updating from account: ${signerAddress}`);

    const MusicPayment = await hre.ethers.getContractFactory("MusicPayment");
    const musicPayment = MusicPayment.attach(contractAddress);

    // Check current price
    const currentPrice = await musicPayment.bnbPriceUSD();
    const currentPriceUSD = Number(currentPrice) / 10 ** 8;
    console.log(`📍 Current on-chain price: $${currentPriceUSD.toFixed(2)}`);

    // Only update if price changed by more than $5 to save gas
    const priceDiff = Math.abs(bnbPriceUSD - currentPriceUSD);
    if (priceDiff < 5) {
      console.log(`✅ Price difference ($${priceDiff.toFixed(2)}) is minimal. No update needed.`);
      return;
    }

    console.log(`\n🔄 Updating price on-chain...`);
    const tx = await musicPayment.updateBNBPrice(bnbPriceScaled);
    console.log(`⏳ Transaction sent: ${tx.hash}`);
    
    await tx.wait();
    console.log(`✅ Price updated successfully!`);

    // Calculate new BNB cost per song
    const requiredBNB = await musicPayment.getRequiredETH();
    const bnbPerSong = Number(requiredBNB) / 10 ** 18;
    console.log(`\n💵 Cost per song: ${bnbPerSong.toFixed(8)} BNB ($0.10)`);

  } catch (error) {
    console.error("❌ Error updating price:", error.message);
    process.exit(1);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });




