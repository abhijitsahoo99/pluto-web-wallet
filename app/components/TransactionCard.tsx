import { memo } from "react";
import {
  ArrowUpDown,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCw,
  RotateCcw,
} from "lucide-react";
import { Transaction } from "../types/transactions";
import { formatTimeAgo } from "../lib/transactions";

interface TransactionCardProps {
  transaction: Transaction;
  onClick?: (transaction: Transaction) => void;
}

export default function TransactionCard({
  transaction,
  onClick,
}: TransactionCardProps) {
  const getTransactionIcon = () => {
    switch (transaction.type) {
      case "send":
        return (
          <div className="w-10 h-10 rounded-full bg-slate-600/60 flex items-center justify-center">
            <ArrowUpRight size={18} className="text-cyan-400" />
          </div>
        );
      case "receive":
        return (
          <div className="w-10 h-10 rounded-full bg-slate-600/60 flex items-center justify-center">
            <ArrowDownLeft size={18} className="text-cyan-400" />
          </div>
        );
      case "swap":
        return (
          <div className="w-10 h-10 rounded-full bg-slate-600/60 flex items-center justify-center">
            <RefreshCw size={18} className="text-cyan-400" />
          </div>
        );
      default:
        return (
          <div className="w-10 h-10 rounded-full bg-slate-600/60 flex items-center justify-center">
            <ArrowUpDown size={18} className="text-cyan-400" />
          </div>
        );
    }
  };

  const getTransactionTitle = () => {
    switch (transaction.type) {
      case "send":
        return `Sent to ${transaction.counterparty || "Unknown"}`;
      case "receive":
        return `Received from ${transaction.counterparty || "Unknown"}`;
      case "swap":
        if (
          transaction.swapDetails &&
          transaction.swapDetails.fromSymbol &&
          transaction.swapDetails.toSymbol
        ) {
          return `Swapped ${transaction.swapDetails.fromSymbol} → ${transaction.swapDetails.toSymbol}`;
        }
        // Fallback for incomplete swap details
        return `Swapped ${transaction.tokenSymbol}`;
      default:
        return "Transaction";
    }
  };

  const getAmountDisplay = () => {
    if (transaction.type === "swap" && transaction.swapDetails) {
      const fromAmount = transaction.swapDetails.fromAmount || 0;
      const toAmount = transaction.swapDetails.toAmount || 0;
      const fromSymbol = transaction.swapDetails.fromSymbol || "Unknown";
      const toSymbol = transaction.swapDetails.toSymbol || "Unknown";

      return (
        <div className="text-right">
          <div className="text-sm font-normal text-red-400">
            - {fromAmount.toFixed(fromAmount < 1 ? 6 : 4)} {fromSymbol}
          </div>
          <div className="text-sm font-normal text-green-400 mt-0.5">
            + {toAmount.toFixed(toAmount < 1 ? 6 : 4)} {toSymbol}
          </div>
        </div>
      );
    }

    const isPositive = transaction.type === "receive";
    const prefix = isPositive ? "+ " : "- ";
    const color = isPositive ? "text-green-400" : "text-red-400";
    const amount = transaction.amount || 0;

    return (
      <div className="text-right">
        <div className={`text-sm font-normal ${color}`}>
          {prefix}
          {amount.toFixed(amount < 1 ? 6 : 4)}
        </div>
        <div className="text-xs text-gray-400 mt-0.5">
          {transaction.tokenSymbol}
        </div>
      </div>
    );
  };

  const handleClick = () => {
    if (onClick) {
      onClick(transaction);
    }
  };

  return (
    <button
      onClick={handleClick}
      className="w-full bg-[#16303e] rounded-2xl p-4 flex items-center justify-between hover:bg-[#16303e]/60 transition-colors"
    >
      {/* Left side - Icon and details */}
      <div className="flex items-center gap-3">
        {getTransactionIcon()}
        <div className="text-left">
          <div className="text-white text-sm font-medium">
            {getTransactionTitle()}
          </div>
          <div className="text-gray-400 text-xs mt-1">
            {formatTimeAgo(transaction.timestamp)}
          </div>
        </div>
      </div>

      {/* Right side - Amount */}
      {getAmountDisplay()}
    </button>
  );
}
