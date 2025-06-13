"use client";

import { usePrivy } from "@privy-io/react-auth";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import { useState, useMemo, useCallback } from "react";
import WalletDashboard from "./components/WalletDashboard";
import { ScanLine, History } from "lucide-react";
import { useRouter } from "next/navigation";

export default function Home() {
  const { login, authenticated, ready, user, logout } = usePrivy();
  const router = useRouter();

  const sendAddress = "SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa";
  const shortSend = sendAddress.slice(0, 4) + "..." + sendAddress.slice(-4);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [isNavigatingToTransactions, setIsNavigatingToTransactions] =
    useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(sendAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, [sendAddress]);

  // Navigate to transactions page with loading state
  const handleTransactionsClick = useCallback(() => {
    router.push("/transactions");
  }, [router]);

  // Optimize wallet address computation with memoization
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

  // Memoize sidebar handlers
  const handleSidebarOpen = useCallback(() => setSidebarOpen(true), []);
  const handleSidebarClose = useCallback(() => setSidebarOpen(false), []);

  // Handle wallet balance updates from WalletDashboard
  const handleWalletBalanceUpdate = useCallback((balance: number) => {
    setWalletBalance(balance);
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

  if (!authenticated) {
    return (
      <div
        className="min-h-screen w-full bg-cover bg-center flex flex-col"
        style={{ backgroundImage: "url('/background.jpg')" }}
      >
        <Navbar landing />
        <main className="flex-1 flex flex-col items-center justify-center px-4">
          <h1 className="text-white text-5xl md:text-6xl font-bold mb-4 text-center drop-shadow-lg">
            Pluto Mobile
          </h1>
          <p className="text-white/80 text-lg md:text-2xl mb-10 text-center max-w-xl">
            solana wallet, built for everyone.
          </p>
          {!authenticated && (
            <button
              onClick={login}
              className="px-10 py-4 bg-white text-[#222] font-bold text-lg md:text-xl rounded-2xl shadow-lg hover:bg-gray-100 transition-all duration-200"
            >
              Log in
            </button>
          )}
        </main>

        {/* Footer */}
        <footer className="fixed bottom-6 left-0 w-full flex items-end justify-between pointer-events-none z-40 px-6">
          {/* Left: Terms & Privacy */}
          <div className="flex flex-col items-start pointer-events-auto">
            <div className="flex gap-4 text-sm text-white/60">
              <a href="#" className="hover:underline">
                Terms
              </a>
              <a href="#" className="hover:underline">
                Privacy
              </a>
            </div>
          </div>

          {/* Right: Send button */}
          <div className="flex items-center gap-2 pointer-events-auto">
            {/* Glassy circle for send icon */}
            <div className="w-9 h-9 rounded-full bg-white/10 backdrop-blur-md border border-cyan-200/30 flex items-center justify-center shadow-lg">
              <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center">
                <img
                  src="/send.png"
                  alt="Send"
                  className="w-4 h-4"
                  draggable={false}
                />
              </div>
            </div>
            {/* Address glassmorphism */}
            <div className="flex items-center gap-2 px-4 py-2 rounded-full border border-cyan-200/30 bg-white/10 backdrop-blur-md shadow-lg">
              <span className="text-white font-semibold tracking-wider text-xs">
                {shortSend}
              </span>
              <button
                className="text-white hover:text-cyan-200 transition"
                tabIndex={0}
                onClick={handleCopy}
              >
                {copied ? (
                  // Tick icon
                  <svg
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  // Copy icon
                  <svg
                    width="18"
                    height="18"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    viewBox="0 0 24 24"
                  >
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                  </svg>
                )}
              </button>
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Dashboard UI after login
  return (
    <div
      className="min-h-screen w-full bg-cover bg-center flex flex-col"
      style={{ backgroundImage: "url('/background.jpg')" }}
    >
      {/* Minimal Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between h-16 px-4">
        {/* Wallet Icon (left) */}
        <button
          className="w-10 h-10 bg-gradient-to-r bg-[#35C2E2] rounded-full flex items-center justify-center"
          onClick={handleSidebarOpen}
          aria-label="Open wallet sidebar"
        >
          <span className="text-white font-bold text-lg">W</span>
        </button>

        {/* Right Icons */}
        <div className="flex items-center gap-3">
          {/* Scanner Icon */}
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-white/10 hover:scale-110 active:scale-95 active:bg-white/20"
            aria-label="Open scanner"
          >
            <ScanLine size={28} stroke="white" strokeWidth={2} />
          </button>

          {/* Transaction Icon */}
          <button
            className="w-10 h-10 flex items-center justify-center rounded-full transition-all duration-200 hover:bg-white/10 hover:scale-110 active:scale-95 active:bg-white/20"
            onClick={handleTransactionsClick}
            aria-label="View transactions"
          >
            <History size={28} stroke="white" strokeWidth={2} />
          </button>
        </div>
      </nav>

      {/* Sidebar */}
      <Sidebar
        isOpen={sidebarOpen}
        onClose={handleSidebarClose}
        walletAddress={walletAddress}
        user={user}
        onLogout={logout}
        totalValueUsd={walletBalance}
      />

      {/* Main Content */}
      <WalletDashboard
        walletAddress={walletAddress}
        onBalanceUpdate={handleWalletBalanceUpdate}
      />
    </div>
  );
}
