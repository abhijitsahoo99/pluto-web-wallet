"use client";

import { useState, useEffect } from "react";
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

  const fetchWalletData = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log("Fetching wallet data for:", walletAddress);
      const data = await getWalletBalance(walletAddress);
      console.log("Wallet data received:", data);
      setWalletData(data);
    } catch (err) {
      console.error("Error fetching wallet data:", err);
      setError("Failed to fetch wallet data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (walletAddress) {
      fetchWalletData();

      // Set up periodic refresh every 30 seconds
      const interval = setInterval(fetchWalletData, 30000);
      return () => clearInterval(interval);
    }
  }, [walletAddress]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center">
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
      <div className="container mx-auto px-4 py-8 max-w-sm">

        {/* Net Worth Card */}
        <NetWorthCard totalValue={walletData?.totalValueUsd || 0} />

        {/* Action Buttons */}
        <ActionButtons />

        {/* Holdings Section */}
        <HoldingsSection
          solBalance={walletData?.solBalance || 0}
          solValueUsd={walletData?.solValueUsd || 0}
          tokens={walletData?.tokens || []}
        />
      </div>
    </div>
  );
}
