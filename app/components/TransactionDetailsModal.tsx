import { useState, useEffect, memo } from "react";
import {
  X,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Copy,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { Transaction } from "../types/transactions";
import { formatTimeAgo } from "../lib/transactions";

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
  isDesktopMode?: boolean;
}

export default function TransactionDetailsModal({
  isOpen,
  onClose,
  transaction,
  isDesktopMode,
}: TransactionDetailsModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
    } else {
      const timer = setTimeout(() => setIsAnimating(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(onClose, 300);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openInSolscan = (signature: string) => {
    window.open(`https://solscan.io/tx/${signature}`, "_blank");
  };

  const getTransactionIcon = () => {
    if (!transaction) return null;

    switch (transaction.type) {
      case "send":
        return <ArrowUpRight size={20} className="text-cyan-400" />;
      case "receive":
        return <ArrowDownLeft size={20} className="text-cyan-400" />;
      case "swap":
        return <RefreshCw size={20} style={{ color: "#9f25b0" }} />;
      default:
        return <ArrowUpRight size={20} className="text-cyan-400" />;
    }
  };

  const getTransactionTitle = () => {
    if (!transaction) return "";

    switch (transaction.type) {
      case "send":
        return "Transfer";
      case "receive":
        return "Transfer";
      case "swap":
        return "Swap";
      default:
        return "Transfer";
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp * 1000);
    return (
      date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      }) +
      " " +
      date.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: true,
      })
    );
  };

  if (!transaction) return null;

  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-300 ${
        isAnimating && isOpen ? "bg-[#051016]" : "bg-transparent"
      } ${isDesktopMode ? "md:bg-transparent" : ""}`}
      onClick={handleBackdropClick}
    >
      <div
        className={`fixed transition-transform duration-300 ease-out border border-white/10 ${
          isDesktopMode
            ? `md:top-16 md:right-0 md:bottom-0 md:w-[350px] md:rounded-l-3xl md:rounded-t-none ${
                isAnimating && isOpen
                  ? "md:translate-x-0"
                  : "md:translate-x-full"
              }`
            : ""
        } bottom-0 left-0 right-0 rounded-t-3xl ${
          isAnimating && isOpen ? "translate-y-0" : "translate-y-full"
        } ${isDesktopMode ? "md:left-auto md:right-0 md:rounded-t-none" : ""}`}
        style={{
          maxHeight: isDesktopMode ? "calc(100vh - 4rem)" : "80vh",
          backgroundColor: "#0a0f14",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-center p-4 border-b border-white/10 relative">
          <div className="w-12  bg-white/20 rounded-full absolute top-4" />
          <button
            onClick={handleClose}
            className="absolute right-6 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
          <h2 className="text-white text-lg font-medium">
            Transaction Details
          </h2>
        </div>

        {/* Content */}
        <div
          className="p-6 overflow-y-auto"
          style={{ maxHeight: "calc(90vh - 80px)" }}
        >
          {/* Transaction Type Card */}
          <div
            className={`backdrop-blur-sm border border-slate-600/30 rounded-2xl p-3 mb-6 ${
              transaction.type === "swap" ? "bg-[#19132b]" : "bg-[#16303e]"
            }`}
          >
            <div className="flex items-center gap-3 mb-2">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center ${
                  transaction.type === "swap" ? "bg-[#3A184F]" : "bg-[#335a62]"
                }`}
              >
                {getTransactionIcon()}
              </div>
              <div>
                <div
                  className={`text-base font-medium ${
                    transaction.type === "swap"
                      ? "text-[#9f25b0]"
                      : "text-[#35C2E2]"
                  }`}
                >
                  {getTransactionTitle()}
                </div>
                <div className="text-gray-400 text-xs">
                  {formatDate(transaction.timestamp)}
                </div>
              </div>
            </div>
          </div>

          {/* Amount Display */}
          {transaction.type === "swap" && transaction.swapDetails ? (
            // Swap Amount Display
            <div className=" bg-[#0D1D2C]  border border-slate-600/30 rounded-2xl p-3 text-center mb-8">
              <div className="flex items-center justify-center gap-4 mb-2">
                <div className="text-center">
                  <div className="text-white text-lg font-medium">
                    {transaction.swapDetails.fromAmount.toFixed(
                      transaction.swapDetails.fromAmount < 1 ? 6 : 4
                    )}{" "}
                    {transaction.swapDetails.fromSymbol}
                  </div>
                  <div className="text-gray-400 text-xs">Paid</div>
                </div>
                <div className="text-gray-400">→</div>
                <div className="text-center">
                  <div className="text-white text-lg font-medium">
                    {transaction.swapDetails.toAmount.toFixed(
                      transaction.swapDetails.toAmount < 1 ? 6 : 4
                    )}{" "}
                    {transaction.swapDetails.toSymbol}
                  </div>
                  <div className="text-gray-400 text-xs">Received</div>
                </div>
              </div>
            </div>
          ) : (
            // Send/Receive Amount Display
            <div className="text-center mb-8">
              <div
                className={`text-3xl font-medium mb-2 ${
                  transaction.type === "receive"
                    ? "text-green-400"
                    : "text-red-400"
                }`}
              >
                {transaction.type === "receive" ? "+ " : "-"}
                {transaction.amount.toFixed(
                  transaction.amount < 1 ? 6 : 4
                )}{" "}
                {transaction.tokenSymbol}
              </div>
              <div className="text-gray-400 text-sm">
                {transaction.type === "receive" ? "Received" : "Sent"}
              </div>
            </div>
          )}

          {/* Details Section */}
          <div className="mb-6">
            <h3 className="text-white text-base font-medium mb-4">Details</h3>

            {/* Fee */}
            <div className="flex justify-between items-center py-3 border-b border-gray-600/30">
              <span className="text-gray-400 text-sm  ">Fee</span>
              <span className="text-white text-sm">
                {transaction.fee
                  ? `${transaction.fee.toFixed(6)} SOL`
                  : "0.0000 SOL"}
              </span>
            </div>

            {/* From/To for Send/Receive */}
            {transaction.type !== "swap" && (
              <>
                {transaction.type === "receive" && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-600/30">
                    <span className="text-gray-400 text-sm">From</span>
                    <span className="text-white text-sm font-mono">
                      {transaction.counterparty || "Unknown"}
                    </span>
                  </div>
                )}
                {transaction.type === "send" && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-600/30">
                    <span className="text-gray-400 text-sm">To</span>
                    <span className="text-white text-sm font-mono">
                      {transaction.counterparty || "Unknown"}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Signature */}
            <div className="flex justify-between items-center py-3 border-b border-gray-600/30">
              <span className="text-gray-400 text-sm">Signature</span>
              <div className="flex items-center gap-2">
                <span className="text-white text-sm font-mono">
                  {transaction.signature.slice(0, 6)}...
                  {transaction.signature.slice(-6)}
                </span>
                <button
                  onClick={() => copyToClipboard(transaction.signature)}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <Copy size={16} />
                </button>
              </div>
            </div>

            {/* Slot */}
            <div className="flex justify-between items-center py-3">
              <span className="text-gray-400 text-sm">Slot</span>
              <span className="text-white text-sm">
                {transaction.slot || "Unknown"}
              </span>
            </div>
          </div>

          {/* View on Solscan Button */}
          <button
            onClick={() => openInSolscan(transaction.signature)}
            className="w-full bg-[#0D1D2C] hover:bg-[#0D1D2C]/80 border border-[#0D1D2C] text-[#35C2E2] py-2 rounded-xl font-medium transition-colors flex items-center justify-center gap-2 mb-6"
          >
            <ExternalLink size={18} />
            View on Solscan
          </button>

          {/* Instructions Section */}
          {/* <div className="flex justify-between items-center">
            <span className="text-white text-lg font-medium">Instructions</span>
            <button className="text-blue-400 text-base">Show</button>
          </div> */}
        </div>
      </div>
    </div>
  );
}
