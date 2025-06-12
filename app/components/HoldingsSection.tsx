import { TokenHolding } from "../lib/solana";
import TokenCard from "./TokenCard";
import { AlignJustify } from "lucide-react";
import { memo, useMemo } from "react";

interface HoldingsSectionProps {
  solBalance: number;
  solValueUsd?: number;
  tokens: TokenHolding[];
}

function HoldingsSection({
  solBalance,
  solValueUsd = 0,
  tokens,
}: HoldingsSectionProps) {
  const hasHoldings = solBalance > 0 || tokens.length > 0;

  // Memoize SOL token card props to prevent unnecessary re-renders
  const solTokenProps = useMemo(
    () => ({
      name: "SOL",
      symbol: "SOL",
      balance: solBalance,
      priceUsd: solBalance > 0 ? (solValueUsd || 0) / solBalance : 0,
      valueUsd: solValueUsd || 0,
      logoUri:
        "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    }),
    [solBalance, solValueUsd]
  );

  return (
    <div className="h-full flex flex-col">
      {/* Scrollable Container */}
      <div className="h-full overflow-y-auto overflow-x-hidden">
        <div className="px-6 pb-6">
          <div className="max-w-sm mx-auto">
            {/* All Holdings Header */}
            <h3 className="text-white text-xl font-bold mb-4 px-1">
              All Holdings
            </h3>

            {/* Holdings Container with liquid glass effect */}
            <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden mb-4">
              {hasHoldings ? (
                <div className="divide-y divide-white/10">
                  {/* SOL Balance */}
                  <TokenCard {...solTokenProps} />

                  {/* SPL Tokens */}
                  {tokens.map((token) => (
                    <TokenCard
                      key={token.mint}
                      name={token.name || "Unknown Token"}
                      symbol={token.symbol || token.mint.slice(0, 6)}
                      balance={token.uiAmount}
                      priceUsd={token.priceUsd || 0}
                      valueUsd={token.valueUsd || 0}
                      logoUri={token.logoUri}
                    />
                  ))}
                </div>
              ) : (
                /* Empty State */
                <div className="text-center py-12 px-6">
                  <p className="text-gray-400 text-base">
                    You currently don't hold any assets.
                  </p>
                </div>
              )}
            </div>

            {/* Manage Tokens Button */}
            <button className="w-full bg-[#35C2E2]/90 backdrop-blur-md border border-[#35C2E2]/30 text-white py-3.5 rounded-2xl font-medium text-base flex items-center justify-center gap-2 transition-all duration-300 hover:bg-[#35C2E2] hover:shadow-lg hover:shadow-[#35C2E2]/25 active:scale-[0.98]">
              <AlignJustify size={18} />
              Manage tokens
            </button>

            {/* Extra padding to allow full scroll */}
            <div className="h-20"></div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default memo(HoldingsSection);
