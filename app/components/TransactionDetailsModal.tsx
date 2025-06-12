import { useState, useEffect } from "react";
import {
  X,
  ArrowUpRight,
  ArrowDownLeft,
  RefreshCw,
  Copy,
  ExternalLink,
} from "lucide-react";
import { Transaction, formatTimeAgo } from "../lib/transactions";

interface TransactionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  transaction: Transaction | null;
}

export default function TransactionDetailsModal({
  isOpen,
  onClose,
  transaction,
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
        return <RefreshCw size={20} className="text-purple-400" />;
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
        isAnimating && isOpen
          ? "bg-black/50 backdrop-blur-sm"
          : "bg-transparent"
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`fixed bottom-0 left-0 right-0 rounded-t-3xl transition-transform duration-300 ease-out border border-white/10 ${
          isAnimating && isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          maxHeight: "90vh",
          background:
            "linear-gradient(135deg, rgba(26, 35, 50, 0.95) 0%, rgba(30, 42, 58, 0.95) 50%, rgba(36, 49, 66, 0.95) 100%)",
          backdropFilter: "blur(20px)",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-center p-6 border-b border-white/10 relative">
          <div className="w-12 h-1 bg-white/20 rounded-full absolute top-3" />
          <h2 className="text-white text-lg font-medium">
            Transaction Details
          </h2>
          <button
            onClick={handleClose}
            className="absolute right-6 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div
          className="p-6 overflow-y-auto"
          style={{ maxHeight: "calc(90vh - 80px)" }}
        >
          {/* Transaction Type Card */}
          <div className="bg-slate-700/40 backdrop-blur-sm border border-slate-600/30 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-full bg-slate-600/60 flex items-center justify-center">
                {getTransactionIcon()}
              </div>
              <div>
                <div className="text-white text-base font-medium">
                  {getTransactionTitle()}
                </div>
                <div className="text-gray-400 text-sm">
                  {formatDate(transaction.timestamp)}
                </div>
              </div>
            </div>
          </div>

          {/* Amount Display */}
          {transaction.type === "swap" && transaction.swapDetails ? (
            // Swap Amount Display
            <div className="text-center mb-8">
              <div className="flex items-center justify-center gap-4 mb-2">
                <div className="text-center">
                  <div className="text-white text-xl font-medium">
                    {transaction.swapDetails.fromAmount.toFixed(
                      transaction.swapDetails.fromAmount < 1 ? 6 : 4
                    )}{" "}
                    {transaction.swapDetails.fromSymbol}
                  </div>
                  <div className="text-gray-400 text-sm">Paid</div>
                </div>
                <div className="text-gray-400">→</div>
                <div className="text-center">
                  <div className="text-white text-xl font-medium">
                    {transaction.swapDetails.toAmount.toFixed(
                      transaction.swapDetails.toAmount < 1 ? 6 : 4
                    )}{" "}
                    {transaction.swapDetails.toSymbol}
                  </div>
                  <div className="text-gray-400 text-sm">Received</div>
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
                    : "text-white"
                }`}
              >
                {transaction.type === "receive" ? "+ " : ""}
                {transaction.amount.toFixed(
                  transaction.amount < 1 ? 6 : 4
                )}{" "}
                {transaction.tokenSymbol}
              </div>
              <div className="text-gray-400 text-base">
                {transaction.type === "receive" ? "Received" : "Sent"}
              </div>
            </div>
          )}

          {/* Details Section */}
          <div className="mb-6">
            <h3 className="text-white text-lg font-medium mb-4">Details</h3>

            {/* Fee */}
            <div className="flex justify-between items-center py-3 border-b border-gray-600/30">
              <span className="text-gray-400 text-base">Fee</span>
              <span className="text-white text-base">
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
                    <span className="text-gray-400 text-base">From</span>
                    <span className="text-white text-base font-mono">
                      {transaction.counterparty || "Unknown"}
                    </span>
                  </div>
                )}
                {transaction.type === "send" && (
                  <div className="flex justify-between items-center py-3 border-b border-gray-600/30">
                    <span className="text-gray-400 text-base">To</span>
                    <span className="text-white text-base font-mono">
                      {transaction.counterparty || "Unknown"}
                    </span>
                  </div>
                )}
              </>
            )}

            {/* Signature */}
            <div className="flex justify-between items-center py-3 border-b border-gray-600/30">
              <span className="text-gray-400 text-base">Signature</span>
              <div className="flex items-center gap-2">
                <span className="text-white text-base font-mono">
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
              <span className="text-gray-400 text-base">Slot</span>
              <span className="text-white text-base">
                {transaction.slot || "Unknown"}
              </span>
            </div>
          </div>

          {/* View on Solscan Button */}
          <button
            onClick={() => openInSolscan(transaction.signature)}
            className="w-full bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/30 text-blue-400 py-4 rounded-2xl font-medium transition-colors flex items-center justify-center gap-2 mb-6"
          >
            <ExternalLink size={18} />
            View on Solscan
          </button>

          {/* Instructions Section */}
          <div className="flex justify-between items-center">
            <span className="text-white text-lg font-medium">Instructions</span>
            <button className="text-blue-400 text-base">Show</button>
          </div>
        </div>
      </div>
    </div>
  );
}
