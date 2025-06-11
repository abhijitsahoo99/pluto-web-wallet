"use client";

import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { getWalletBalance, WalletBalance } from "../lib/solana";
import NetWorthCard from "./NetWorthCard";
import ActionButtons from "./ActionButtons";
import HoldingsSection from "./HoldingsSection";

interface WalletDashboardProps {
  walletAddress: string;
}

export default function WalletDashboard({
  walletAddress,
}: WalletDashboardProps) {
  const [walletData, setWalletData] = useState<WalletBalance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const fetchingRef = useRef(false);

  const fetchWalletData = useCallback(async () => {
    // Prevent multiple simultaneous fetches
    if (fetchingRef.current || !walletAddress || walletAddress.trim() === "") {
      return;
    }

    try {
      fetchingRef.current = true;
      setLoading(true);
      setError(null);
      const data = await getWalletBalance(walletAddress);
      setWalletData(data);
    } catch (err) {
      console.error("Error fetching wallet data:", err);
      setError("Failed to fetch wallet data");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  }, [walletAddress]);

  useEffect(() => {
    if (walletAddress && walletAddress.trim() !== "") {
      fetchWalletData();

      // Reduced polling frequency from 30s to 60s for better performance
      const interval = setInterval(fetchWalletData, 60000);
      return () => {
        clearInterval(interval);
        fetchingRef.current = false;
      };
    } else {
      // Reset state when wallet address is empty
      setWalletData(null);
      setLoading(true);
      setError(null);
    }
  }, [fetchWalletData]);

  // Memoize computed values to prevent unnecessary re-renders
  const memoizedValues = useMemo(
    () => ({
      totalValue: walletData?.totalValueUsd || 0,
      solBalance: walletData?.solBalance || 0,
      solValueUsd: walletData?.solValueUsd || 0,
      tokens: walletData?.tokens || [],
    }),
    [walletData]
  );

  // Show loading for empty wallet address
  if (!walletAddress || walletAddress.trim() === "") {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#35C2E2] mb-4"></div>
        <p className="text-white/70 text-lg">Connecting to wallet...</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#35C2E2] mb-4"></div>
        <p className="text-white/70 text-lg">Loading your wallet...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-cover bg-center pt-16 flex flex-col items-center justify-center">
        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-6 backdrop-blur-md">
          <p className="text-red-400 text-lg">{error}</p>
          <button
            onClick={fetchWalletData}
            className="mt-4 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cover bg-center pt-16">
      <div className="container mx-auto px-6 py-6 max-w-sm">
        {/* Net Worth Card */}
        <NetWorthCard totalValue={memoizedValues.totalValue} />

        {/* Action Buttons */}
        <ActionButtons />

        {/* Holdings Section */}
        <HoldingsSection
          solBalance={memoizedValues.solBalance}
          solValueUsd={memoizedValues.solValueUsd}
          tokens={memoizedValues.tokens}
        />
      </div>
    </div>
  );
}
