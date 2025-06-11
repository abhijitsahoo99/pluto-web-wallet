import { TokenHolding } from "../lib/solana";
import TokenCard from "./TokenCard";
import { Plus } from "lucide-react";

interface HoldingsSectionProps {
  solBalance: number;
  solValueUsd?: number;
  tokens: TokenHolding[];
}

export default function HoldingsSection({
  solBalance,
  solValueUsd = 0,
  tokens,
}: HoldingsSectionProps) {
  const hasHoldings = solBalance > 0 || tokens.length > 0;

  return (
    <div className="space-y-6">
      {/* All Holdings Header */}
      <h3 className="text-white text-2xl font-bold">All Holdings</h3>

      {/* Holdings Container - Dark background like reference */}
      <div className="bg-gray-900/80 rounded-2xl p-6">
        {hasHoldings ? (
          <div className="space-y-1">
            {/* SOL Balance - Always show SOL first like reference */}
            <TokenCard
              name="SOL"
              symbol="SOL"
              balance={solBalance}
              priceUsd={solValueUsd || 0}
              valueUsd={solValueUsd || 0}
              logoUri="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
            />

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
          <div className="text-center py-12">
            <p className="text-white/70 text-lg font-medium">
              You currently don't hold any assets.
            </p>
          </div>
        )}
      </div>

      {/* Manage Tokens Button - Blue like reference */}
      <button className="w-full bg-[#35C2E2] text-white py-4 rounded-2xl font-semibold text-lg flex items-center justify-center gap-2 transition-all duration-300 hover:bg-[#2BA8C7]">
        <Plus size={20} />
        Manage tokens
      </button>
    </div>
  );
}
