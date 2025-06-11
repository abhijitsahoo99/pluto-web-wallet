import { TokenHolding } from "../lib/solana";
import TokenCard from "./TokenCard";
import { Plus } from "lucide-react";
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
    <div className="space-y-4">
      {/* All Holdings Header - Matching reference image */}
      <h3 className="text-white text-xl font-bold px-1">All Holdings</h3>

      {/* Holdings Container - Exact match to reference image */}
      <div className="bg-[#1a1d29] backdrop-blur-md border border-gray-700/30 rounded-2xl overflow-hidden">
        {hasHoldings ? (
          <div className="divide-y divide-gray-700/40">
            {/* SOL Balance - Always show SOL first like reference */}
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

      {/* Manage Tokens Button - Liquid glassmorphism style */}
      <button className="w-full bg-[#35C2E2]/90 backdrop-blur-md border border-[#35C2E2]/30 text-white py-3.5 rounded-2xl font-medium text-base flex items-center justify-center gap-2 transition-all duration-300 hover:bg-[#35C2E2] hover:shadow-lg hover:shadow-[#35C2E2]/25 active:scale-[0.98]">
        <Plus size={18} />
        Manage tokens
      </button>
    </div>
  );
}

export default memo(HoldingsSection);
