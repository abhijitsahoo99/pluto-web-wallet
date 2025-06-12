"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import TransactionCard from "../components/TransactionCard";
import TransactionDetailsModal from "../components/TransactionDetailsModal";
import { getWalletTransactions, Transaction } from "../lib/transactions";

export default function TransactionsPage() {
  const { user, authenticated, ready } = usePrivy();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Get wallet address
  const walletAddress = useMemo(() => {
    if (!user?.linkedAccounts) return "";

    const solanaWallet = user.linkedAccounts.find(
      (account) =>
        account.type === "wallet" &&
        account.walletClientType === "privy" &&
        account.chainType === "solana"
    );

    return (solanaWallet as any)?.address || "";
  }, [user?.linkedAccounts]);

  // Fetch transactions
  const fetchTransactions = useCallback(
    async (forceRefresh = false) => {
      if (!walletAddress) return;

      try {
        setLoading(true);
        setError(null);
        if (forceRefresh) {
          setIsRefreshing(true);
        }
        const txData = await getWalletTransactions(walletAddress);
        setTransactions(txData);
      } catch (err) {
        console.error("Error fetching transactions:", err);
        setError("Failed to fetch transactions");
      } finally {
        setLoading(false);
        setIsRefreshing(false);
      }
    },
    [walletAddress]
  );

  useEffect(() => {
    if (walletAddress) {
      fetchTransactions();
    }
  }, [fetchTransactions]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.back();
  }, [router]);

  // Handle transaction card click
  const handleTransactionClick = useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsModalOpen(true);
  }, []);

  // Handle modal close
  const handleModalClose = useCallback(() => {
    setIsModalOpen(false);
    setSelectedTransaction(null);
  }, []);

  // Show loading state while Privy is initializing
  if (!ready) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-black">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#35C2E2] mb-4"></div>
        <p className="text-white/70 text-lg">Initializing...</p>
      </div>
    );
  }

  // Redirect if not authenticated
  if (!authenticated) {
    router.push("/");
    return null;
  }

  return (
    <>
      <div
        className="h-screen w-full bg-cover bg-center flex flex-col"
        style={{ backgroundImage: "url('/background.jpg')" }}
      >
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={handleBack}
              className="w-10 h-10 flex items-center justify-center"
              aria-label="Go back"
            >
              <ArrowLeft size={24} stroke="white" strokeWidth={2} />
            </button>
            <h1 className="text-white text-lg font-medium">Transactions</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Content Container - Fixed height with proper scrolling */}
        <div className="flex-1 flex flex-col pt-16 overflow-hidden">
          {/* Header Section - Fixed height */}
          <div className="flex-shrink-0 px-4 py-6">
            <div className="max-w-sm mx-auto">
              <h2 className="text-white text-xl font-medium mb-4">
                All Transactions
              </h2>
            </div>
          </div>

          {/* Scrollable Transactions List - Takes remaining space */}
          <div className="flex-1 overflow-y-auto px-4 pb-safe">
            <div className="max-w-sm mx-auto">
              {loading ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#35C2E2] mb-4"></div>
                  <p className="text-white/70">
                    {isRefreshing ? "Refreshing..." : "Loading transactions..."}
                  </p>
                </div>
              ) : error ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-red-400 mb-4">{error}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => fetchTransactions()}
                      className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      Retry
                    </button>
                    <button
                      onClick={() => fetchTransactions(true)}
                      className="px-4 py-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-colors"
                    >
                      Force Refresh
                    </button>
                  </div>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12">
                  <p className="text-gray-400 text-center mb-4">
                    No transactions found
                  </p>
                  <button
                    onClick={() => fetchTransactions(true)}
                    className="px-4 py-2 bg-gray-500/20 text-gray-400 rounded-lg hover:bg-gray-500/30 transition-colors"
                  >
                    Refresh
                  </button>
                </div>
              ) : (
                <>
                  {/* Transaction counter - sticky at top */}
                  <div className="sticky top-0 bg-black/20 backdrop-blur-sm py-3 -mx-4 px-4 mb-4 z-10">
                    <div className="max-w-sm mx-auto flex justify-between items-center">
                      <p className="text-white/70 text-sm">
                        {transactions.length} transactions
                      </p>
                      <button
                        onClick={() => fetchTransactions(true)}
                        disabled={isRefreshing}
                        className="px-3 py-1 bg-white/10 text-white/70 text-sm rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50"
                      >
                        {isRefreshing ? "..." : "Refresh"}
                      </button>
                    </div>
                  </div>

                  {/* Transaction list with generous bottom spacing */}
                  <div className="space-y-3 pb-32">
                    {transactions.map((transaction) => (
                      <TransactionCard
                        key={transaction.signature}
                        transaction={transaction}
                        onClick={handleTransactionClick}
                      />
                    ))}
                    {/* Extra spacer to ensure last item is fully visible */}
                    <div className="h-16"></div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        transaction={selectedTransaction}
      />
    </>
  );
}
