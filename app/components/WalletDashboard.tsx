"use client";

import { useState, useEffect, useRef, useCallback, useMemo, memo } from "react";
import { usePrivy } from "@privy-io/react-auth";
import { getWalletBalance } from "../lib/solana";
import { WalletBalance } from "../types/solana";
import NetWorthCard from "./NetWorthCard";
import ActionButtons from "./ActionButtons";
import { AlignJustify } from "lucide-react";
import TokenCard from "./TokenCard";
import TokenDetailsModal from "./TokenDetailsModal";
import ManageTokensModal from "./ManageTokensModal";
import SendModal from "./SendModal";
import ReceiveModal from "./ReceiveModal";
import SwapModal from "./SwapModal";
import TransactionCard from "./TransactionCard";
import TransactionDetailsModal from "./TransactionDetailsModal";
import { getWalletTransactions } from "../lib/transactions";
import { Transaction } from "../types/transactions";

interface WalletDashboardProps {
  walletAddress: string;
  onBalanceUpdate?: (balance: number) => void;
  recipientAddress?: string;
  onSendModalOpen?: () => void;
}

// Constants
const SOL_LOGO_URI =
  "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png";
const POLLING_INTERVAL = 90000; // 90 seconds - more conservative to prevent rate limiting

// Loading component to reduce duplication
const LoadingScreen = ({ message }: { message: string }) => (
  <div
    className="h-screen w-full mobile-bg-cover flex flex-col items-center justify-center"
    style={{ backgroundImage: "url('/background.jpg')" }}
  >
    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#35C2E2] mb-4"></div>
    <p className="text-white/70 text-lg">{message}</p>
  </div>
);

export default function WalletDashboard({
  walletAddress,
  onBalanceUpdate,
  recipientAddress,
  onSendModalOpen,
}: WalletDashboardProps) {
  const [walletData, setWalletData] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isManageTokensOpen, setIsManageTokensOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
  const [isTokenDetailsOpen, setIsTokenDetailsOpen] = useState(false);
  const [selectedTokenMint, setSelectedTokenMint] = useState<string | null>(
    null
  );
  const [swapFromToken, setSwapFromToken] = useState<string>("");
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [visibleTokens, setVisibleTokens] = useState<Set<string>>(() => {
    // Initialize from localStorage or default to SOL only
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(`visibleTokens_${walletAddress}`);
        if (saved) {
          return new Set(JSON.parse(saved));
        }
      } catch (error) {
        console.warn("Failed to load visible tokens from localStorage:", error);
      }
    }
    return new Set(["SOL"]); // Default: SOL visible
  });
  const fetchingRef = useRef(false);
  const [sendRecipientAddress, setSendRecipientAddress] = useState<string>("");

  // Desktop-specific state
  const [activeDesktopTab, setActiveDesktopTab] = useState<
    "swap" | "send" | "receive"
  >("swap");
  const [hoveredToken, setHoveredToken] = useState<string>("");
  const [isDesktopSidebarOpen, setIsDesktopSidebarOpen] = useState(true);
  const [copySuccess, setCopySuccess] = useState(false);

  // Right sidebar state
  const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(
    null
  );
  const [selectedTransaction, setSelectedTransaction] =
    useState<Transaction | null>(null);
  const [isTransactionModalOpen, setIsTransactionModalOpen] = useState(false);
  const [hasMoreTransactions, setHasMoreTransactions] = useState(false);
  const [nextTransactionCursor, setNextTransactionCursor] = useState<
    string | undefined
  >();
  const [loadingMoreTransactions, setLoadingMoreTransactions] = useState(false);

  // Persist visible tokens to localStorage whenever it changes
  useEffect(() => {
    if (walletAddress && visibleTokens.size > 0) {
      try {
        localStorage.setItem(
          `visibleTokens_${walletAddress}`,
          JSON.stringify(Array.from(visibleTokens))
        );
      } catch (error) {
        console.warn("Failed to save visible tokens to localStorage:", error);
      }
    }
  }, [visibleTokens, walletAddress]);

  const fetchWalletData = useCallback(
    async (isBackground = false) => {
      if (fetchingRef.current || !walletAddress?.trim()) return;

      try {
        fetchingRef.current = true;

        // Only show loading screen on initial load, not background updates
        if (!isBackground && isInitialLoad) {
          setLoading(true);
        }

        setError(null);

        const data = await getWalletBalance(walletAddress);
        setWalletData(data);
        onBalanceUpdate?.(data.totalValueUsd);

        // Only auto-add new tokens on first load (when no localStorage data exists)
        // This prevents re-adding tokens that user has explicitly hidden
        if (data.tokens.length > 0) {
          const hasStoredPreferences =
            typeof window !== "undefined" &&
            localStorage.getItem(`visibleTokens_${walletAddress}`);

          if (!hasStoredPreferences) {
            // First time loading - auto-show all tokens
            setVisibleTokens((prev) => {
              const newSet = new Set(prev);
              data.tokens.forEach((token) => {
                newSet.add(token.mint);
              });
              return newSet;
            });
          }
        }
      } catch (err) {
        console.error("Error fetching wallet data:", err);

        // Only show error screen if it's not a background update and we don't have existing data
        if (!isBackground || !walletData) {
          setError("Failed to fetch wallet data");
        }
      } finally {
        if (isInitialLoad) {
          setLoading(false);
          setIsInitialLoad(false);
        }
        fetchingRef.current = false;
      }
    },
    [walletAddress, onBalanceUpdate, isInitialLoad, walletData]
  );

  useEffect(() => {
    if (!walletAddress?.trim()) {
      setWalletData(null);
      setLoading(true);
      setError(null);
      setIsInitialLoad(true);
      return;
    }

    // Initial load
    fetchWalletData(false);

    // Background polling - doesn't interfere with UI
    const interval = setInterval(() => {
      fetchWalletData(true);
    }, POLLING_INTERVAL);

    return () => {
      clearInterval(interval);
      fetchingRef.current = false;
    };
  }, [fetchWalletData]);

  // Manual refresh function for error retry
  const handleManualRefresh = useCallback(() => {
    setIsInitialLoad(true);
    fetchWalletData(false);
  }, [fetchWalletData]);

  // Handle token click for details modal
  const handleTokenClick = useCallback((mint: string) => {
    setSelectedTokenMint(mint);
    setIsTokenDetailsOpen(true);
  }, []);

  // Find the selected token data
  const selectedTokenData = useMemo(() => {
    if (!selectedTokenMint) return null;
    if (selectedTokenMint === "So11111111111111111111111111111111111111112") {
      // SOL token
      return {
        mint: "So11111111111111111111111111111111111111112",
        balance: walletData?.solBalance ? walletData.solBalance * 1e9 : 0, // Convert to lamports
        decimals: 9,
        uiAmount: walletData?.solBalance || 0,
        name: "Solana",
        symbol: "SOL",
        logoUri:
          "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
        priceUsd: walletData?.solBalance
          ? (walletData.solValueUsd || 0) / walletData.solBalance
          : 0,
        valueUsd: walletData?.solValueUsd || 0,
      };
    }
    return (
      walletData?.tokens.find((token) => token.mint === selectedTokenMint) ||
      null
    );
  }, [selectedTokenMint, walletData]);

  // Handle token details modal close
  const handleTokenDetailsClose = useCallback(() => {
    setIsTokenDetailsOpen(false);
    setSelectedTokenMint(null);
  }, []);

  // Handle swap from token details
  const handleSwapFromTokenDetails = useCallback((fromToken: string) => {
    setSwapFromToken(fromToken);
    setActiveDesktopTab("swap"); // Switch to swap tab in desktop
    setIsTokenDetailsOpen(false); // Close token details modal
    // Don't open mobile swap modal - use desktop interface instead
  }, []);

  // Handle swap modal close
  const handleSwapModalClose = useCallback(() => {
    setIsSwapModalOpen(false);
    setSwapFromToken("");
  }, []);

  // Memoize computed values and filter visible tokens
  const {
    totalValue,
    solBalance,
    solValueUsd,
    tokens,
    solTokenProps,
    visibleTokensList,
  } = useMemo(() => {
    const totalValue = walletData?.totalValueUsd || 0;
    const solBalance = walletData?.solBalance || 0;
    const solValueUsd = walletData?.solValueUsd || 0;
    const tokens = walletData?.tokens || [];

    // Filter tokens based on visibility
    const visibleTokensList = tokens.filter((token) =>
      visibleTokens.has(token.mint)
    );

    const solTokenProps = {
      name: "SOL",
      symbol: "SOL",
      balance: solBalance,
      priceUsd: solBalance > 0 ? solValueUsd / solBalance : 0,
      valueUsd: solValueUsd,
      logoUri: SOL_LOGO_URI,
      mint: "So11111111111111111111111111111111111111112",
    };

    return {
      totalValue,
      solBalance,
      solValueUsd,
      tokens,
      solTokenProps,
      visibleTokensList,
    };
  }, [walletData, visibleTokens]);

  const hasVisibleHoldings =
    (visibleTokens.has("SOL") && solBalance > 0) ||
    visibleTokensList.length > 0;

  // Handle token visibility toggle
  const handleToggleToken = useCallback(
    (tokenMint: string, isVisible: boolean) => {
      setVisibleTokens((prev) => {
        const newSet = new Set(prev);
        if (isVisible) {
          newSet.add(tokenMint);
        } else {
          newSet.delete(tokenMint);
        }
        return newSet;
      });
    },
    []
  );

  // Handle recipient address from QR scan - optimized to prevent unnecessary re-renders
  useEffect(() => {
    if (recipientAddress && recipientAddress.trim() && !isSendModalOpen) {
      setSendRecipientAddress(recipientAddress);
      setIsSendModalOpen(true);
      onSendModalOpen?.(); // Notify parent that send modal was opened
    }
  }, [recipientAddress, isSendModalOpen, onSendModalOpen]);

  // Desktop-specific handlers
  const handleDesktopTabChange = useCallback(
    (tab: "swap" | "send" | "receive") => {
      setActiveDesktopTab(tab);
    },
    []
  );

  const handleTokenHover = useCallback(
    (tokenMint: string) => {
      setHoveredToken(tokenMint);
      // Auto-select token in swap interface on hover (desktop only)
      if (tokenMint && activeDesktopTab === "swap") {
        setSwapFromToken(tokenMint);
      }
    },
    [activeDesktopTab]
  );

  const handleTokenHoverLeave = useCallback(() => {
    setHoveredToken("");
  }, []);

  const handleCopyAddress = useCallback(() => {
    if (walletAddress) {
      navigator.clipboard.writeText(walletAddress);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    }
  }, [walletAddress]);

  // Transaction handlers
  const fetchTransactions = useCallback(async () => {
    if (!walletAddress || transactionsLoading) return;

    try {
      setTransactionsLoading(true);
      setTransactionsError(null);
      const result = await getWalletTransactions(walletAddress, {
        limit: 15,
      });
      setTransactions(result.transactions);
      setHasMoreTransactions(result.hasMore);
      setNextTransactionCursor(result.nextCursor);
    } catch (err) {
      console.error("Error fetching transactions:", err);
      setTransactionsError("Failed to fetch transactions");
    } finally {
      setTransactionsLoading(false);
    }
  }, [walletAddress, transactionsLoading]);

  const loadMoreTransactions = useCallback(async () => {
    if (!walletAddress || !nextTransactionCursor || loadingMoreTransactions)
      return;

    try {
      setLoadingMoreTransactions(true);
      const result = await getWalletTransactions(walletAddress, {
        limit: 15,
        before: nextTransactionCursor,
      });

      setTransactions((prev) => [...prev, ...result.transactions]);
      setHasMoreTransactions(result.hasMore);
      setNextTransactionCursor(result.nextCursor);
    } catch (err) {
      console.error("Error loading more transactions:", err);
      setTransactionsError("Failed to load more transactions");
    } finally {
      setLoadingMoreTransactions(false);
    }
  }, [walletAddress, nextTransactionCursor, loadingMoreTransactions]);

  const handleTransactionClick = useCallback((transaction: Transaction) => {
    setSelectedTransaction(transaction);
    setIsTransactionModalOpen(true);
  }, []);

  const handleTransactionModalClose = useCallback(() => {
    setIsTransactionModalOpen(false);
    setSelectedTransaction(null);
  }, []);

  const handleRightSidebarToggle = useCallback(() => {
    setIsRightSidebarOpen((prev) => {
      if (!prev && transactions.length === 0) {
        // Fetch transactions when opening sidebar for the first time
        fetchTransactions();
      }
      return !prev;
    });
  }, [transactions.length, fetchTransactions]);

  // Early returns for different states
  if (!walletAddress?.trim()) {
    return <LoadingScreen message="Connecting to wallet..." />;
  }

  if (loading && isInitialLoad) {
    return <LoadingScreen message="Loading your wallet..." />;
  }

  if (error && !walletData) {
    return (
      <div
        className="h-screen w-full mobile-bg-cover flex flex-col items-center justify-center"
        style={{ backgroundImage: "url('/background.jpg')" }}
      >
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 backdrop-blur-md">
          <p className="text-red-400 text-lg">{error}</p>
          <button
            onClick={handleManualRefresh}
            className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Mobile Layout (unchanged) */}
      <div className="md:hidden">
        <div
          className="h-screen w-full mobile-bg-cover relative"
          style={{ backgroundImage: "url('/background.jpg')" }}
        >
          {/* Navbar Space */}
          <div className="h-16" />

          {/* Scrollable Content */}
          <div className="absolute inset-x-0 bottom-0 top-16">
            <div className="h-full overflow-y-auto">
              <div className="px-4">
                <div className="max-w-md mx-auto">
                  {/* Net Worth Card */}
                  <div className="mb-6">
                    <NetWorthCard totalValue={totalValue} />
                  </div>

                  {/* Action Buttons */}
                  <div className="mb-8">
                    <ActionButtons
                      onSendClick={() => setIsSendModalOpen(true)}
                      onReceiveClick={() => setIsReceiveModalOpen(true)}
                      onSwapClick={() => setIsSwapModalOpen(true)}
                    />
                  </div>

                  {/* All Holdings Header */}
                  <h3 className="text-white text-xl font-bold mb-4 px-1">
                    All Holdings
                  </h3>

                  {/* Holdings Container */}
                  <div className="bg-black/40 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden mb-4">
                    {hasVisibleHoldings ? (
                      <div className="divide-y divide-white/10">
                        {/* SOL Balance - only show if visible and has balance */}
                        {visibleTokens.has("SOL") && solBalance > 0 && (
                          <TokenCard
                            {...solTokenProps}
                            onClick={handleTokenClick}
                          />
                        )}

                        {/* Visible SPL Tokens */}
                        {visibleTokensList.map((token) => (
                          <TokenCard
                            key={token.mint}
                            name={token.name || "Unknown Token"}
                            symbol={token.symbol || token.mint.slice(0, 6)}
                            balance={token.uiAmount}
                            priceUsd={token.priceUsd || 0}
                            valueUsd={token.valueUsd || 0}
                            logoUri={token.logoUri}
                            mint={token.mint}
                            onClick={handleTokenClick}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-12 px-6">
                        <p className="text-gray-400 text-base">
                          {solBalance > 0 || tokens.length > 0
                            ? "No tokens selected for display. Use 'Manage tokens' to show your holdings."
                            : "You currently don't hold any assets."}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Manage Tokens Button */}
                  <button
                    onClick={() => setIsManageTokensOpen(true)}
                    className="w-full bg-[#35C2E2]/90 backdrop-blur-md border border-[#35C2E2]/30 text-white py-3.5 rounded-2xl font-medium text-base flex items-center justify-center gap-2 transition-all duration-300 hover:bg-[#35C2E2] hover:shadow-lg hover:shadow-[#35C2E2]/25 active:scale-[0.98]"
                  >
                    <AlignJustify size={18} />
                    Manage tokens
                  </button>

                  {/* Bottom Padding */}
                  <div className="h-20" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop Layout */}
      <div
        className="hidden md:flex md:h-screen bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/background.jpg')" }}
      >
        {/* Left Sidebar - Enhanced */}
        {isDesktopSidebarOpen ? (
          <div className="md:w-[350px] md:flex-shrink-0 md:border-r md:border-white/10 md:flex md:flex-col">
            <div className="md:h-full md:overflow-y-auto md:p-6">
              {/* Header with Back Button */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {/* W Logo */}
                  <div className="w-10 h-10 bg-[#35C2E2]/20 backdrop-blur-md border border-[#35C2E2]/30 rounded-xl flex items-center justify-center">
                    <span className="text-[#35C2E2] font-bold text-lg">W</span>
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-base">Wallet 1</h2>
                    <div className="flex items-center gap-2">
                      <span className="text-gray-400 text-xs font-mono">
                        {walletAddress
                          ? `${walletAddress.slice(
                              0,
                              4
                            )}...${walletAddress.slice(-4)}`
                          : ""}
                      </span>
                      <button
                        onClick={handleCopyAddress}
                        className="p-1 hover:bg-white/10 rounded transition-colors"
                        title="Copy wallet address"
                      >
                        {copySuccess ? (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            className="text-green-400"
                          >
                            <path
                              d="M20 6L9 17l-5-5"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                        ) : (
                          <svg
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            className="text-gray-400 hover:text-white"
                          >
                            <path
                              d="M8 4v12a2 2 0 002 2h8a2 2 0 002-2V7.242a2 2 0 00-.602-1.43L16.083 2.57A2 2 0 0014.685 2H10a2 2 0 00-2 2z"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                            />
                            <path
                              d="M16 18v2a2 2 0 01-2 2H6a2 2 0 01-2-2V9a2 2 0 012-2h2"
                              stroke="currentColor"
                              strokeWidth="2"
                              fill="none"
                            />
                          </svg>
                        )}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Back Button with Hover Effect */}
                <button
                  onClick={() => setIsDesktopSidebarOpen(false)}
                  className="p-2 rounded-full transition-all duration-200 hover:bg-white/10 hover:backdrop-blur-md hover:border hover:border-white/20 hover:shadow-lg"
                  title="Close sidebar"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-gray-400 hover:text-white"
                  >
                    <path
                      d="m15 18-6-6 6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              {/* Net Worth Display */}
              <div className="mb-6">
                <NetWorthCard totalValue={totalValue} />
              </div>

              {/* My Holdings Section */}
              <div className="mb-6">
                <h3 className="text-white text-lg font-bold mb-4">
                  My Holdings
                </h3>
                <div className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-2xl overflow-hidden">
                  {hasVisibleHoldings ? (
                    <div className="divide-y divide-white/10">
                      {/* SOL Balance */}
                      {visibleTokens.has("SOL") && solBalance > 0 && (
                        <div
                          onMouseEnter={() =>
                            handleTokenHover(
                              "So11111111111111111111111111111111111111112"
                            )
                          }
                          onMouseLeave={handleTokenHoverLeave}
                          className={`transition-all duration-200 ${
                            hoveredToken ===
                            "So11111111111111111111111111111111111111112"
                              ? "bg-white/5 scale-[1.01]"
                              : ""
                          }`}
                        >
                          <TokenCard
                            {...solTokenProps}
                            onClick={handleTokenClick}
                          />
                        </div>
                      )}

                      {/* SPL Tokens */}
                      {visibleTokensList.map((token) => (
                        <div
                          key={token.mint}
                          onMouseEnter={() => handleTokenHover(token.mint)}
                          onMouseLeave={handleTokenHoverLeave}
                          className={`transition-all duration-200 ${
                            hoveredToken === token.mint
                              ? "bg-white/5 scale-[1.01]"
                              : ""
                          }`}
                        >
                          <TokenCard
                            name={token.name || "Unknown Token"}
                            symbol={token.symbol || token.mint.slice(0, 6)}
                            balance={token.uiAmount}
                            priceUsd={token.priceUsd || 0}
                            valueUsd={token.valueUsd || 0}
                            logoUri={token.logoUri}
                            mint={token.mint}
                            onClick={handleTokenClick}
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-8 px-4">
                      <p className="text-gray-400 text-sm">
                        {solBalance > 0 || tokens.length > 0
                          ? "No tokens selected for display."
                          : "No assets found."}
                      </p>
                    </div>
                  )}
                </div>

                {/* Manage Tokens Button */}
                <button
                  onClick={() => setIsManageTokensOpen(true)}
                  className="w-full mt-3 bg-[#35C2E2]/90 backdrop-blur-md border border-[#35C2E2]/30 text-white py-2.5 rounded-xl font-medium text-sm flex items-center justify-center gap-2 transition-all duration-300 hover:bg-[#35C2E2] hover:shadow-lg hover:shadow-[#35C2E2]/25"
                >
                  <AlignJustify size={16} />
                  Manage tokens
                </button>
              </div>

              {/* Spacer for utility links */}
              <div className="flex-1" />

              {/* Utility Links Section - Reordered */}
              <div className="space-y-3 pt-6 border-t border-white/10">
                <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-200/30 bg-white/10 backdrop-blur-md shadow-lg text-white font-semibold text-base w-full">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-current"
                  >
                    <circle
                      cx="11"
                      cy="11"
                      r="8"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="m21 21-4.35-4.35"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  Explorer
                </button>

                <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-200/30 bg-white/10 backdrop-blur-md shadow-lg text-white font-semibold text-base w-full">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-current"
                  >
                    <path
                      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <polyline
                      points="14,2 14,8 20,8"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <line
                      x1="16"
                      y1="13"
                      x2="8"
                      y2="13"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <line
                      x1="16"
                      y1="17"
                      x2="8"
                      y2="17"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <polyline
                      points="10,9 9,9 8,9"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  Export Wallet
                </button>

                <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-200/30 bg-white/10 backdrop-blur-md shadow-lg text-white font-semibold text-base w-full">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-current"
                  >
                    <rect
                      x="3"
                      y="11"
                      width="18"
                      height="11"
                      rx="2"
                      ry="2"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <circle
                      cx="12"
                      cy="16"
                      r="1"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <path
                      d="M7 11V7a5 5 0 0 1 10 0v4"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  Privacy Policy
                </button>

                <button className="flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-200/30 bg-white/10 backdrop-blur-md shadow-lg text-white font-semibold text-base w-full">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-current"
                  >
                    <path
                      d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <polyline
                      points="14,2 14,8 20,8"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <line
                      x1="16"
                      y1="13"
                      x2="8"
                      y2="13"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                    <line
                      x1="16"
                      y1="17"
                      x2="8"
                      y2="17"
                      stroke="currentColor"
                      strokeWidth="2"
                    />
                  </svg>
                  Terms of Use
                </button>

                {/* Logout Button - Mobile Style */}
                <button className="w-full bg-red-500/10 border border-red-500/30 text-red-400 py-2.5 px-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 mb-5 transition-colors hover:bg-red-500/20">
                  <svg
                    width="16"
                    height="16"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-current"
                  >
                    <path
                      d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <polyline
                      points="16 17 21 12 16 7"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <line
                      x1="21"
                      y1="12"
                      x2="9"
                      y2="12"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  Logout
                </button>

                {/* Action Buttons - Mobile Style */}
                <div className="flex gap-2 mb-5">
                  <button className="flex-1 bg-[#35C2E2] text-white py-2.5 px-3 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 transition-colors hover:bg-[#35C2E2]/90">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-current"
                    >
                      <path
                        d="M9 12l2 2 4-4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M21 12c-1 0-3-1-3-3s2-3 3-3 3 1 3 3-2 3-3 3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M3 12c1 0 3-1 3-3s-2-3-3-3-3 1-3 3 2 3 3 3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Rate Us
                  </button>
                  <button className="flex-1 bg-[#2a2f3f] text-white py-2.5 px-3 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 border border-gray-600/30 transition-colors hover:bg-[#2a2f3f]/80">
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-current"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                      <path
                        d="M12 17h.01"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    Get Help
                  </button>
                </div>

                {/* Social Icons - Mobile Style */}
                <div className="flex justify-center gap-6">
                  <a
                    href="https://x.com/solanaappkit"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter"
                    className="w-8 h-8 flex items-center justify-center text-[#35C2E2] hover:text-[#35C2E2]/80 transition-colors"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                    </svg>
                  </a>
                  <a
                    href="https://t.me/solanaappkit"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Telegram"
                    className="w-8 h-8 flex items-center justify-center text-[#35C2E2] hover:text-[#35C2E2]/80 transition-colors"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="currentColor"
                    >
                      <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.306.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                    </svg>
                  </a>
                  <a
                    href="https://www.solanaappkit.com"
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Website"
                    className="w-8 h-8 flex items-center justify-center text-[#35C2E2] hover:text-[#35C2E2]/80 transition-colors"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-current"
                    >
                      <circle
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <line
                        x1="2"
                        y1="12"
                        x2="22"
                        y2="12"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                      <path
                        d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"
                        stroke="currentColor"
                        strokeWidth="2"
                      />
                    </svg>
                  </a>
                </div>
              </div>
            </div>
          </div>
        ) : (
          /* Collapsed Sidebar - W Only */
          <div className="md:w-16 md:flex-shrink-0 md:border-r md:border-white/10 md:flex md:flex-col md:items-center md:py-6">
            <button
              onClick={() => setIsDesktopSidebarOpen(true)}
              className="w-10 h-10 bg-[#35C2E2]/20 backdrop-blur-md border border-[#35C2E2]/30 rounded-xl flex items-center justify-center hover:bg-[#35C2E2]/30 transition-all"
              title="Open sidebar"
            >
              <span className="text-[#35C2E2] font-bold text-lg">W</span>
            </button>
          </div>
        )}

        {/* Main Content Area */}
        <div className="md:flex-1 md:flex md:flex-col">
          {/* Navbar Space */}
          <div className="md:h-16" />

          {/* Content based on sidebar state */}
          {isDesktopSidebarOpen ? (
            <>
              {/* Tab Navigation - Centered */}
              <div className="md:flex md:justify-center md:px-8 md:py-6">
                <div className="flex gap-1 bg-black/20 backdrop-blur-md border border-white/10 rounded-xl p-1 max-w-md opacity-0 pointer-events-none">
                  <button className="flex-1 py-3 px-6 rounded-lg text-base font-medium">
                    Swap
                  </button>
                  <button className="flex-1 py-3 px-6 rounded-lg text-base font-medium">
                    Send
                  </button>
                  <button className="flex-1 py-3 px-6 rounded-lg text-base font-medium">
                    Receive
                  </button>
                </div>
              </div>
            </>
          ) : (
            /* Empty space when sidebar is closed - modals are fixed positioned */
            <div className="md:flex-1"></div>
          )}
        </div>

        {/* Fixed Positioned Modals - Always Centered */}
        <div className="hidden md:block fixed inset-0 pointer-events-none z-10">
          <div className="flex items-center justify-center h-full">
            <div className="w-full max-w-md space-y-6 pointer-events-auto mt-16">
              {/* Tab Navigation - Always Centered */}
              <div className="flex gap-1 bg-black/20 backdrop-blur-md border border-white/10 rounded-xl p-1">
                <button
                  onClick={() => handleDesktopTabChange("swap")}
                  className={`flex-1 py-3 px-6 rounded-lg text-base font-medium transition-all duration-200 ${
                    activeDesktopTab === "swap"
                      ? "bg-[#35C2E2] text-white shadow-lg"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  Swap
                </button>
                <button
                  onClick={() => handleDesktopTabChange("send")}
                  className={`flex-1 py-3 px-6 rounded-lg text-base font-medium transition-all duration-200 ${
                    activeDesktopTab === "send"
                      ? "bg-[#35C2E2] text-white shadow-lg"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  Send
                </button>
                <button
                  onClick={() => handleDesktopTabChange("receive")}
                  className={`flex-1 py-3 px-6 rounded-lg text-base font-medium transition-all duration-200 ${
                    activeDesktopTab === "receive"
                      ? "bg-[#35C2E2] text-white shadow-lg"
                      : "text-gray-400 hover:text-white hover:bg-white/5"
                  }`}
                >
                  Receive
                </button>
              </div>

              {/* Modal Content - Always Centered */}
              <div className="w-full">
                {activeDesktopTab === "swap" && (
                  <SwapModal
                    isOpen={true}
                    onClose={() => {}}
                    solBalance={solBalance}
                    tokens={tokens}
                    walletAddress={walletAddress}
                    defaultFromToken={swapFromToken}
                    isDesktopMode={true}
                  />
                )}

                {activeDesktopTab === "send" && (
                  <SendModal
                    isOpen={true}
                    onClose={() => {}}
                    solBalance={solBalance}
                    solValueUsd={solValueUsd}
                    tokens={tokens}
                    walletAddress={walletAddress}
                    recipientAddress={sendRecipientAddress}
                    isDesktopMode={true}
                  />
                )}

                {activeDesktopTab === "receive" && (
                  <ReceiveModal
                    isOpen={true}
                    onClose={() => {}}
                    walletAddress={walletAddress}
                    isDesktopMode={true}
                  />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        {isRightSidebarOpen ? (
          <div className="md:w-[350px] md:flex-shrink-0 md:border-l md:border-white/10 md:flex md:flex-col">
            <div className="md:h-full md:overflow-y-auto md:p-6">
              {/* Header with Back Button */}
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  {/* Transaction Icon */}
                  <div className="w-10 h-10 bg-[#35C2E2]/20 backdrop-blur-md border border-[#35C2E2]/30 rounded-xl flex items-center justify-center">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      className="text-[#35C2E2]"
                    >
                      <path
                        d="M3 3v5h5M21 21v-5h-5M21 3l-9 9-4-4-4 4"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  </div>
                  <div>
                    <h2 className="text-white font-bold text-lg">
                      All Transactions
                    </h2>
                    <div className="text-gray-400 text-xs">
                      {transactions.length} transactions
                    </div>
                  </div>
                </div>

                {/* Back Button */}
                <button
                  onClick={() => setIsRightSidebarOpen(false)}
                  className="p-2 rounded-full transition-all duration-200 hover:bg-white/10 hover:backdrop-blur-md hover:border hover:border-white/20 hover:shadow-lg"
                  title="Close sidebar"
                >
                  <svg
                    width="18"
                    height="18"
                    viewBox="0 0 24 24"
                    fill="none"
                    className="text-gray-400 hover:text-white"
                  >
                    <path
                      d="m9 18 6-6-6-6"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </button>
              </div>

              {/* Transactions List */}
              <div className="flex-1">
                {transactionsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-[#35C2E2] mb-4"></div>
                    <p className="text-white/70">Loading transactions...</p>
                  </div>
                ) : transactionsError ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <p className="text-red-400 text-center mb-4">
                      {transactionsError}
                    </p>
                    <button
                      onClick={fetchTransactions}
                      className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
                    >
                      Retry
                    </button>
                  </div>
                ) : transactions.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12">
                    <p className="text-gray-400 text-center mb-4">
                      No transactions found
                    </p>
                    <button
                      onClick={fetchTransactions}
                      className="px-4 py-2 bg-gray-500/20 text-gray-400 rounded-lg hover:bg-gray-500/30 transition-colors"
                    >
                      Refresh
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {transactions.map((transaction) => (
                      <TransactionCard
                        key={transaction.signature}
                        transaction={transaction}
                        onClick={handleTransactionClick}
                      />
                    ))}

                    {/* Load More Button */}
                    {hasMoreTransactions && (
                      <div className="pt-4">
                        <button
                          onClick={loadMoreTransactions}
                          disabled={loadingMoreTransactions}
                          className="w-full py-3 bg-white/10 text-white rounded-lg hover:bg-white/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loadingMoreTransactions ? (
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
                    {!hasMoreTransactions && transactions.length > 0 && (
                      <div className="pt-4 text-center">
                        <p className="text-white/50 text-sm">
                          All transactions loaded
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          /* Collapsed Right Sidebar - Transaction Icon Only */
          <div className="md:w-16 md:flex-shrink-0 md:border-l md:border-white/10 md:flex md:flex-col md:items-center md:py-6">
            <button
              onClick={handleRightSidebarToggle}
              className="w-10 h-10 bg-[#35C2E2]/20 backdrop-blur-md border border-[#35C2E2]/30 rounded-xl flex items-center justify-center hover:bg-[#35C2E2]/30 transition-all"
              title="Open transactions"
            >
              <svg
                width="18"
                height="18"
                viewBox="0 0 24 24"
                fill="none"
                className="text-[#35C2E2]"
              >
                <path
                  d="M3 3v5h5M21 21v-5h-5M21 3l-9 9-4-4-4 4"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        )}
      </div>

      {/* Token Details Modal */}
      <TokenDetailsModal
        isOpen={isTokenDetailsOpen}
        onClose={handleTokenDetailsClose}
        tokenMint={selectedTokenMint}
        tokenSymbol={selectedTokenData?.symbol}
        onSwapClick={handleSwapFromTokenDetails}
        existingTokenData={selectedTokenData}
      />

      {/* Manage Tokens Modal */}
      <ManageTokensModal
        isOpen={isManageTokensOpen}
        onClose={() => setIsManageTokensOpen(false)}
        solBalance={solBalance}
        solValueUsd={solValueUsd}
        tokens={tokens}
        visibleTokens={visibleTokens}
        onToggleToken={handleToggleToken}
      />

      {/* Send Modal */}
      <SendModal
        isOpen={isSendModalOpen}
        onClose={() => {
          setIsSendModalOpen(false);
          setSendRecipientAddress(""); // Clear recipient address when modal closes
        }}
        solBalance={solBalance}
        solValueUsd={solValueUsd}
        tokens={tokens}
        walletAddress={walletAddress}
        recipientAddress={sendRecipientAddress}
      />

      {/* Receive Modal */}
      <ReceiveModal
        isOpen={isReceiveModalOpen}
        onClose={() => setIsReceiveModalOpen(false)}
        walletAddress={walletAddress}
      />

      {/* Swap Modal */}
      <SwapModal
        isOpen={isSwapModalOpen}
        onClose={handleSwapModalClose}
        solBalance={solBalance}
        tokens={tokens}
        walletAddress={walletAddress}
        defaultFromToken={swapFromToken}
      />

      {/* Transaction Details Modal */}
      <TransactionDetailsModal
        isOpen={isTransactionModalOpen}
        onClose={handleTransactionModalClose}
        transaction={selectedTransaction}
        isDesktopMode={true}
      />
    </>
  );
}
