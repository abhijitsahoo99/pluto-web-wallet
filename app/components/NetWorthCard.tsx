import { CreditCard } from "lucide-react";

interface NetWorthCardProps {
  totalValue: number;
}

export default function NetWorthCard({ totalValue }: NetWorthCardProps) {
  const formatValue = (value: number) => {
    if (value === 0) return "0.00";
    if (value < 0.01) return "< 0.01";
    return value.toLocaleString("en-US", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  };

  return (
    <div className="text-center mb-8">
      {/* Net Worth Text */}
      <h2 className="text-white text-xl font-medium mb-4">Net Worth</h2>

      {/* Large Dollar Amount */}
      <div className="text-white text-6xl font-bold mb-8">
        ${formatValue(totalValue)}
      </div>

      {/* Deposit Button - Exact blue from reference */}
      <button className="bg-[#35C2E2] text-white px-8 py-4 rounded-full font-semibold text-lg flex items-center justify-center gap-2 mx-auto transition-all duration-300 hover:bg-[#2BA8C7]">
        <CreditCard size={20} />
        Deposit
      </button>
    </div>
  );
}
