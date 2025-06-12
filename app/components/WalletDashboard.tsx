"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getWalletBalance, WalletBalance } from "../lib/solana";
import NetWorthCard from "./NetWorthCard";
import ActionButtons from "./ActionButtons";
import { AlignJustify } from "lucide-react";
import TokenCard from "./TokenCard";
import ManageTokensModal from "./ManageTokensModal";
import SendModal from "./SendModal";
import ReceiveModal from "./ReceiveModal";
import SwapModal from "./SwapModal";

interface WalletDashboardProps {
  walletAddress: string;
  onBalanceUpdate?: (balance: number) => void;
}

// Constants
const SOL_LOGO_URI =
  "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png";
const POLLING_INTERVAL = 60000; // 60 seconds

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
}: WalletDashboardProps) {
  const [walletData, setWalletData] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isManageTokensOpen, setIsManageTokensOpen] = useState(false);
  const [isSendModalOpen, setIsSendModalOpen] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);
  const [isSwapModalOpen, setIsSwapModalOpen] = useState(false);
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
      <div
        className="h-screen w-full mobile-bg-cover relative"
        style={{ backgroundImage: "url('/background.jpg')" }}
      >
        {/* Navbar Space */}
        <div className="h-16" />

        {/* Scrollable Content */}
        <div className="absolute inset-x-0 bottom-0 top-16">
          <div className="h-full overflow-y-auto">
            <div className="px-6">
              <div className="max-w-sm mx-auto">
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
                        <TokenCard {...solTokenProps} />
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
        onClose={() => setIsSendModalOpen(false)}
        solBalance={solBalance}
        solValueUsd={solValueUsd}
        tokens={tokens}
        walletAddress={walletAddress}
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
        onClose={() => setIsSwapModalOpen(false)}
        solBalance={solBalance}
        tokens={tokens}
        walletAddress={walletAddress}
      />
    </>
  );
}
