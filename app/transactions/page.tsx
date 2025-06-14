"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import TransactionCard from "../components/TransactionCard";
import TransactionDetailsModal from "../components/TransactionDetailsModal";
import { getWalletTransactions } from "../lib/transactions";
import { Transaction } from "../types/transactions";

export default function TransactionsPage() {
  const { user, authenticated, ready } = usePrivy();
  const router = useRouter();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | undefined>();

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

  // Fetch transactions (first page)
  const fetchTransactions = useCallback(
    async (forceRefresh = false) => {
      if (!walletAddress) return;

      try {
        setLoading(true);
        setError(null);
        if (forceRefresh) {
          setIsRefreshing(true);
        }
        const result = await getWalletTransactions(walletAddress, {
          limit: 15,
        });
        setTransactions(result.transactions);
        setHasMore(result.hasMore);
        setNextCursor(result.nextCursor);
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

  // Load more transactions
  const loadMoreTransactions = useCallback(async () => {
    if (!walletAddress || !nextCursor || loadingMore) return;

    try {
      setLoadingMore(true);
      const result = await getWalletTransactions(walletAddress, {
        limit: 15,
        before: nextCursor,
      });

      setTransactions((prev) => [...prev, ...result.transactions]);
      setHasMore(result.hasMore);
      setNextCursor(result.nextCursor);
    } catch (err) {
      console.error("Error loading more transactions:", err);
      setError("Failed to load more transactions");
    } finally {
      setLoadingMore(false);
    }
  }, [walletAddress, nextCursor, loadingMore]);

  useEffect(() => {
    if (walletAddress) {
      fetchTransactions();
    }
  }, [fetchTransactions]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    router.push("/");
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
        {/* <p className="text-white/70 text-lg">Initializing...</p> */}
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
      <div className="h-screen w-full bg-[#000000] flex flex-col">
        {/* Header */}
        <div className="fixed top-0 left-0 right-0 z-50">
          <div className="flex items-center justify-between h-16 px-4">
            <button
              onClick={handleBack}
              className="w-10 h-10 flex items-center justify-center"
              aria-label="Go back"
            >
              <ArrowLeft size={24} stroke="white" strokeWidth={2} />
            </button>
            <h1 className="text-white text-lg font-medium">All Transactions</h1>
            <div className="w-10" /> {/* Spacer for centering */}
          </div>
        </div>

        {/* Content Container - Fixed height with proper scrolling */}
        <div className="flex-1 flex flex-col pt-16 overflow-hidden">
          {/* Header Section - Fixed height */}
          {/* <div className="flex-shrink-0 px-4 py-6">
            <div className="max-w-sm mx-auto">
              <h2 className="text-white text-xl font-medium mb-4">
                All Transactions
              </h2>
            </div>
          </div> */}

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

                  {/* Transaction list with Load More button */}
                  <div className="space-y-3 pb-32">
                    {transactions.map((transaction) => (
                      <TransactionCard
                        key={transaction.signature}
                        transaction={transaction}
                        onClick={handleTransactionClick}
                      />
                    ))}

                    {/* Load More Button */}
                    {hasMore && (
                      <div className="pt-4">
                        <button
                          onClick={loadMoreTransactions}
                          disabled={loadingMore}
                          className="w-full py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingMore ? (
                            <div className="flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                              Loading more...
                            </div>
                          ) : (
                            "Load More Transactions"
                          )}
                        </button>
                      </div>
                    )}

                    {/* End of transactions indicator */}
                    {!hasMore && transactions.length > 0 && (
                      <div className="pt-4 text-center">
                        <p className="text-white/50 text-sm">
                          All transactions loaded
                        </p>
                      </div>
                    )}

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
