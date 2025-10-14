import { NextResponse } from 'next/server'

export async function GET() {
  try {
    // Fetch BNB price from CoinGecko (free API, no key required)
    const response = await fetch(
      'https://api.coingecko.com/api/v3/simple/price?ids=binancecoin&vs_currencies=usd',
      {
        headers: {
          'Accept': 'application/json',
        },
        next: { revalidate: 60 } // Cache for 60 seconds
      }
    )

    if (!response.ok) {
      throw new Error('Failed to fetch BNB price from CoinGecko')
    }

    const data = await response.json()
    const bnbPriceUSD = data.binancecoin?.usd

    if (!bnbPriceUSD) {
      throw new Error('Invalid response from CoinGecko')
    }

    // Calculate how much BNB is needed for $0.10 (1 credit)
    const creditPriceUSD = 0.10
    const bnbPerCredit = creditPriceUSD / bnbPriceUSD

    return NextResponse.json({
      success: true,
      bnbPriceUSD: bnbPriceUSD,
      bnbPerCredit: bnbPerCredit.toFixed(8),
      creditPriceUSD: creditPriceUSD,
      source: 'CoinGecko',
      timestamp: Date.now()
    })

  } catch (error) {
    console.error('Error fetching BNB price:', error)
    
    // Fallback: Use conservative estimate if CoinGecko fails
    // Assuming BNB = $600 (conservative), $0.10 / $600 = 0.000167 BNB
    return NextResponse.json({
      success: true,
      bnbPriceUSD: 600,
      bnbPerCredit: '0.00016667',
      creditPriceUSD: 0.10,
      source: 'Fallback',
      timestamp: Date.now(),
      warning: 'Using fallback price - CoinGecko API unavailable'
    })
  }
}

