import { memo, useMemo } from "react";

interface TokenCardProps {
  name: string;
  symbol: string;
  balance: number;
  priceUsd: number;
  valueUsd: number;
  logoUri?: string;
  mint?: string;
  onClick?: (mint: string, symbol: string) => void;
}

function TokenCard({
  name,
  symbol,
  balance,
  priceUsd,
  valueUsd,
  logoUri,
  mint,
  onClick,
}: TokenCardProps) {
  // Memoize formatted values to prevent re-computation on every render
  const formattedBalance = useMemo(() => {
    if (balance === 0) return `0 ${symbol}`;
    if (balance < 0.000001) return `< 0.000001 ${symbol}`;

    // Format large numbers with K, M, B suffixes
    if (balance >= 1000000000) {
      return `${(balance / 1000000000).toFixed(1)}B ${symbol}`;
    }
    if (balance >= 1000000) {
      return `${(balance / 1000000).toFixed(2)}M ${symbol}`;
    }
    if (balance >= 1000) {
      return `${(balance / 1000).toFixed(1)}K ${symbol}`;
    }

    // For smaller numbers, use appropriate decimals
    let decimals = 6;
    if (symbol === "SOL") decimals = 6;
    else if (symbol === "USDC") decimals = 2;
    else if (balance < 1) decimals = 4;
    else if (balance < 100) decimals = 2;
    else decimals = 0;

    return `${balance.toFixed(decimals)} ${symbol}`;
  }, [balance, symbol]);

  const formattedPrice = useMemo(() => {
    // Convert to number and handle all edge cases
    const numPrice = Number(priceUsd);
    if (!priceUsd || !isFinite(numPrice) || numPrice <= 0) return "$0.00";

    // For very small numbers, use scientific notation
    if (numPrice < 0.000001) {
      return `$${numPrice.toExponential(2)}`;
    }

    // For small prices, show more decimals to avoid showing $0.00
    if (numPrice < 0.01) {
      return `$${numPrice.toFixed(4)}`;
    }

    // For prices >= $0.01, show 2 decimal places
    return `$${numPrice.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, [priceUsd]);

  const formattedValue = useMemo(() => {
    // Convert to number and handle all edge cases
    const numValue = Number(valueUsd);
    if (!valueUsd || !isFinite(numValue) || numValue <= 0) return "$0.00";
    if (numValue < 0.01) return "< $0.01";
    return `$${numValue.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  }, [valueUsd]);

  const handleClick = () => {
    if (onClick && mint) {
      onClick(mint, symbol);
    }
  };

  const CardContent = (
    <>
      {/* Left side - Token info */}
      <div className="flex items-center gap-4">
        {/* Token logo - Made smaller */}
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center overflow-hidden flex-shrink-0">
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
            className={`text-white font-bold text-xs ${
              logoUri ? "hidden" : ""
            }`}
          >
            {symbol.slice(0, 3).toUpperCase()}
          </div>
        </div>

        {/* Token details - Reduced font size and weight */}
        <div className="flex flex-col">
          <div className="text-white font-medium text-base leading-tight text-left">
            {symbol}
          </div>
          <div className="text-gray-400 text-sm mt-0.5 text-left">
            {formattedPrice}
          </div>
        </div>
      </div>

      {/* Right side - Balance and value */}
      <div className="text-right flex-shrink-0">
        <div className="text-white font-bold text-lg leading-tight">
          {formattedValue}
        </div>
        <div className="text-gray-400 text-sm mt-0.5">{formattedBalance}</div>
      </div>
    </>
  );

  // If onClick is provided, render as button, otherwise as div
  if (onClick && mint) {
    return (
      <button
        onClick={handleClick}
        className="flex items-center justify-between px-6 py-5 w-full hover:bg-white/5 transition-colors"
      >
        {CardContent}
      </button>
    );
  }

  return (
    <div className="flex items-center justify-between px-6 py-5">
      {CardContent}
    </div>
  );
}

export default memo(TokenCard);
