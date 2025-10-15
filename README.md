# WeAD AI Music Composer

[![BNB Chain](https://img.shields.io/badge/BNB%20Chain-Supported-yellow)](https://www.bnbchain.org/)
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](LICENSE)
[![Next.js 14](https://img.shields.io/badge/Next.js-14-black.svg)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue.svg)](https://www.typescriptlang.org/)

## 🎵 Overview

**WeAD AI Music Composer** is a blockchain-powered AI music generation platform built on **BNB Chain**, enabling users to create professional soundtracks instantly using cryptocurrency payments.

### Key Features

- 🎼 **AI Music Generation** - Create professional soundtracks instantly
- 💰 **Crypto Payments** - Pay with WeAD Token on BNB Chain
- ⛓️ **BNB Chain Integration** - Fast, low-cost transactions
- 🔒 **Web3 Wallet** - Secure MetaMask connection
- 💾 **Decentralized Storage** - Music stored securely
- 🎧 **Instant Playback** - Play your music in the browser
- 📥 **MP3 Downloads** - Download high-quality audio files
- 🎨 **Modern UI** - Beautiful, responsive design

## 🏗️ Architecture

### Frontend (Next.js 14)
- **Framework**: React 18 with TypeScript
- **Styling**: Tailwind CSS with custom theme
- **Web3 Integration**: Ethers.js v6 + MetaMask
- **Internationalization**: i18next support

### Smart Contracts (BNB Chain)
- **MusicPayment.sol** - Payment processing contract
- **WeADToken.sol** - Platform BEP-20 token
- **Network**: BSC Mainnet (Chain ID: 56)

### Backend API
- **AI Music Engine** - Professional music generation
- **Payment Processing** - On-chain transaction handling
- **File Management** - Secure storage system

## 📦 Installation

### Prerequisites

```bash
# System requirements
- Node.js 16+ and npm
- MetaMask wallet
- Git
```

### Clone Repository

```bash
git clone https://github.com/Kennethlee83/Ai-Music-Composer.git
cd Ai-Music-Composer
```

### Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp env.example .env.local

# Configure .env.local with your settings
nano .env.local
```

### Smart Contract Deployment

```bash
# Compile contracts
npx hardhat compile

# Deploy to BSC Mainnet
npx hardhat run scripts/deploy-payment.js --network bsc

# Verify on BSCScan
npx hardhat verify --network bsc CONTRACT_ADDRESS
```

### Run Application

```bash
# Development mode
npm run dev

# Production mode
npm run build
npm start
```

## 🔑 Configuration

### Environment Variables

Create a `.env.local` file based on `env.example`:

```bash
# BNB Chain Configuration
NEXT_PUBLIC_CHAIN_ID=56
NEXT_PUBLIC_RPC_URL=https://bsc-dataseed.binance.org/
BSC_RPC_URL=https://bsc-dataseed.binance.org/

# Smart Contracts (BSC Mainnet)
NEXT_PUBLIC_WEAD_TOKEN_ADDRESS=0xCF99bF2cbD83A580437d39A5092C1665Faa9898B
NEXT_PUBLIC_MUSIC_PAYMENT_ADDRESS=0xDA90A244279C1BB9D0EA156D26A842a3B1bCB9BE

# Private Keys (NEVER commit these!)
PRIVATE_KEY=your_private_key_here
BSCSCAN_API_KEY=your_bscscan_api_key

# AI Music Generation
AI_MUSIC_API_KEY=your_api_key_here
AI_MUSIC_BASE_URL=your_api_endpoint
```

⚠️ **Security Warning**: Never commit your `.env.local` file or expose private keys!

## 🎮 Usage

### For Users

1. **Connect Wallet**
   - Click "Connect Wallet" button
   - Approve MetaMask connection
   - Network will auto-switch to BSC

2. **Create Music**
   - Enter song title
   - Describe your music style
   - Add lyrics or description
   - Choose instrumental or vocal

3. **Pay with WeAD**
   - Approve WeAD token spending
   - Confirm payment transaction
   - Cost: Variable based on generation length

4. **Download & Enjoy**
   - Music generates in 30-60 seconds
   - Play in browser
   - Download MP3 file

## 🔗 Smart Contract Integration

### Music Payment Contract

```javascript
// Process payment for music generation
const tx = await musicPaymentContract.processPayment(
  amount,
  tokenAddress
);

// Check payment status
const status = await musicPaymentContract.getPaymentStatus(
  paymentId
);
```

### WeAD Token Contract

```javascript
// Approve spending
const approveTx = await weadToken.approve(
  musicPaymentAddress,
  amount
);

// Check balance
const balance = await weadToken.balanceOf(userAddress);
```

## 📊 BNB Chain Development Activity

### Contract Deployments
- **WeAD Token**: `0xCF99bF2cbD83A580437d39A5092C1665Faa9898B`
- **Music Payment**: `0xDA90A244279C1BB9D0EA156D26A842a3B1bCB9BE`

### Development Metrics
- Active development on BNB Chain
- Smart contract integration with payment systems
- Real-world music generation platform
- Growing user base

## 🗺️ Roadmap

### Q4 2025
- [x] BSC Mainnet deployment
- [x] AI music generation integration
- [x] Payment system implementation
- [ ] DappBay listing

### Q1 2026
- [ ] WeAD Token rewards system
- [ ] User dashboard and history
- [ ] Social features and sharing
- [ ] Mobile app version

### Q2 2026
- [ ] NFT minting for compositions
- [ ] Music marketplace
- [ ] Royalty distribution system
- [ ] DAO governance

## 🧪 Testing

```bash
# Run contract tests
npx hardhat test

# Run with gas reporting
npx hardhat test --gas-report

# Test deployment (local)
npx hardhat run scripts/deploy-payment.js --network hardhat
```

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md).

## 🔒 Security

- Smart contracts follow OpenZeppelin standards
- Secure payment processing
- No custodial wallet functions
- Regular security audits

**Found a security issue?** Please email security@wead.io instead of creating a public issue.

## 📄 License

This project is **proprietary and confidential**. The code is made publicly visible for verification purposes only (blockchain directories, partners, investors).

**All Rights Reserved** - Unauthorized use, copying, modification, or distribution is strictly prohibited.

For commercial licensing inquiries: licensing@wead.info

See the [LICENSE](LICENSE) file for complete terms and conditions.

## 📞 Contact & Community

- **Website**: [weadcomposer.info](https://weadcomposer.info)
- **Twitter**: [@WeADPlatform](https://twitter.com/WeADPlatform)
- **Telegram**: [t.me/WeADCommunity](https://t.me/WeADCommunity)
- **Email**: radiojack31@gmail.com

## 🙏 Acknowledgments

- **BNB Chain** - For the robust blockchain infrastructure
- **OpenZeppelin** - For secure smart contract libraries
- **Next.js Team** - For the amazing React framework
- **Our Community** - For continuous support and feedback

---

**Built with ❤️ by the WeAD Team on BNB Chain**

*Empowering creators with AI-powered music generation on the blockchain.*

