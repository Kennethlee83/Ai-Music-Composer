'use client'

export function SimpleTokenBalance() {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-4">💰 Token Balance</h3>
      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">WEAD Tokens:</span>
          <span className="font-semibold">1,000 WEAD</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">ETH:</span>
          <span className="font-semibold">0.5 ETH</span>
        </div>
      </div>
    </div>
  )
}



