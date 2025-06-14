import { CreditCard } from "lucide-react";
import { memo, useMemo } from "react";

interface NetWorthCardProps {
  totalValue: number;
}

function NetWorthCard({ totalValue }: NetWorthCardProps) {
  const formattedValue = useMemo(() => {
    if (totalValue === 0) return "0.00";

    // For very small values, show more precision
    if (totalValue < 0.01) return totalValue.toFixed(6);
    if (totalValue < 1) return totalValue.toFixed(4);
    if (totalValue < 100) return totalValue.toFixed(3);

    // For larger values, show appropriate precision
    return totalValue.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }, [totalValue]);

  return (
    <div className="text-center mb-6">
      {/* Net Worth Text - Matching reference image size */}
      <h2 className="text-white/90 text-lg font-medium mb-3">Net Worth</h2>

      {/* Large Dollar Amount - Matching reference image size and weight */}
      <div className="text-white text-5xl font-bold mb-6 tracking-tight">
        ${formattedValue}
      </div>

      {/* Deposit Button - Liquid glassmorphism style matching reference dimensions */}
      <button className="bg-[#35C2E2]/90 backdrop-blur-md border border-[#35C2E2]/30 text-white px-12 py-3.5 rounded-full font-medium text-base flex items-center justify-center gap-2 mx-auto transition-all duration-300 hover:bg-[#35C2E2] hover:shadow-lg hover:shadow-[#35C2E2]/25 active:scale-95 min-w-[160px]">
        <CreditCard size={18} />
        Deposit
      </button>
    </div>
  );
}

export default memo(NetWorthCard);
