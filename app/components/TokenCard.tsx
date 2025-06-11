interface TokenCardProps {
  name: string;
  symbol: string;
  balance: number;
  priceUsd: number;
  valueUsd: number;
  logoUri?: string;
}

export default function TokenCard({
  name,
  symbol,
  balance,
  priceUsd,
  valueUsd,
  logoUri,
}: TokenCardProps) {
  const formatBalance = (balance: number, symbol: string) => {
    if (balance === 0) return `0 ${symbol}`;
    if (balance < 0.000001) return `< 0.000001 ${symbol}`;

    let decimals = 6;
    if (symbol === "SOL") decimals = 6;
    else if (symbol === "USDC") decimals = 6;
    else if (balance < 1) decimals = 6;
    else if (balance < 100) decimals = 2;
    else decimals = 0;

    return `${balance.toLocaleString("en-US", {
      minimumFractionDigits: 0,
      maximumFractionDigits: decimals,
    })} ${symbol}`;
  };

  const formatPrice = (price: number | undefined | null) => {
    if (price == null || price === 0 || isNaN(price)) return "$0.00";
    if (price < 0.01) return "< $0.01";
    if (price < 1) return `$${price.toFixed(4)}`;
    return `$${price.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const formatValue = (value: number | undefined | null) => {
    if (value == null || value === 0 || isNaN(value)) return "$0.00";
    if (value < 0.01) return "< $0.01";
    return `$${value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  return (
    <div className="flex items-center justify-between py-4 border-b border-gray-700/50 last:border-b-0">
      {/* Left side - Token info */}
      <div className="flex items-center gap-3">
        {/* Token logo */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden flex-shrink-0">
          {logoUri ? (
            <img
              src={logoUri}
              alt={symbol}
              className="w-10 h-10 rounded-full object-cover"
              onError={(e) => {
                // Fallback to initials if image fails to load
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                const fallback = target.nextElementSibling as HTMLElement;
                if (fallback) fallback.classList.remove("hidden");
              }}
            />
          ) : null}
          <div
            className={`text-white font-bold text-sm ${
              logoUri ? "hidden" : ""
            }`}
          >
            {symbol.slice(0, 3).toUpperCase()}
          </div>
        </div>

        {/* Token details */}
        <div className="flex flex-col min-w-0">
          <div className="text-white font-semibold text-lg">{symbol}</div>
          <div className="text-white/70 text-sm">{formatPrice(priceUsd)}</div>
        </div>
      </div>

      {/* Right side - Balance and value */}
      <div className="text-right flex-shrink-0">
        <div className="text-white font-semibold text-lg">
          {formatValue(valueUsd)}
        </div>
        <div className="text-white/70 text-sm">
          {formatBalance(balance, symbol)}
        </div>
      </div>
    </div>
  );
}
