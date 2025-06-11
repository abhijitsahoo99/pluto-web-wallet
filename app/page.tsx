"use client";

import { usePrivy } from "@privy-io/react-auth";
import Navbar from "./components/Navbar";
import { useState } from "react";
import WalletDashboard from "./components/WalletDashboard";

export default function Home() {
  const { login, authenticated, ready, user } = usePrivy();

  const sendAddress = "SENDdRQtYMWaQrBroBrJ2Q53fgVuq95CV9UPGEvpCxa";
  const shortSend = sendAddress.slice(0, 4) + "..." + sendAddress.slice(-4);
  const [copied, setCopied] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(sendAddress);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  // Get Solana wallet address from Privy user
  const solanaWallet = user?.linkedAccounts?.find(
    (account) =>
      account.type === "wallet" &&
      account.walletClientType === "privy" &&
      account.chainType === "solana"
  );
  const walletAddress = (solanaWallet as any)?.address || "";

  // Debug logging
  console.log("🔍 Debug Info:");
  console.log("User object:", user);
  console.log("Linked accounts:", user?.linkedAccounts);
  console.log("Found Solana wallet:", solanaWallet);
  console.log("Wallet address:", walletAddress);

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
        <footer className="fixed bottom-6 left-0 w-full flex items-end justify-center pointer-events-none z-40">
          {/* Left: Terms & Privacy */}
          <div className="absolute left-6 bottom-0 flex flex-col items-start pointer-events-auto">
            <div className="flex gap-4 text-sm text-white/60">
              <a href="#" className="hover:underline">
                Terms
              </a>
              <a href="#" className="hover:underline">
                Privacy
              </a>
            </div>
          </div>
          {/* Center: Send button */}
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
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/20 backdrop-blur-md border-b border-white/10 flex items-center justify-between h-16 px-4">
        {/* Wallet Icon (left) */}
        <button
          className="w-10 h-10 bg-gradient-to-r from-[#35C2E2] to-[#4F84F5] rounded-full flex items-center justify-center"
          onClick={() => setSidebarOpen(true)}
          aria-label="Open wallet sidebar"
        >
          <span className="text-white font-bold text-lg">W</span>
        </button>
        {/* Scanner Icon (right) */}
        <button
          className="w-10 h-10 flex items-center justify-center"
          aria-label="Open scanner"
        >
          {/* Lucide ScanLine SVG */}
          <svg
            width="28"
            height="28"
            fill="none"
            stroke="white"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            viewBox="0 0 24 24"
          >
            <rect x="3" y="3" width="7" height="7" rx="2" />
            <rect x="14" y="3" width="7" height="7" rx="2" />
            <rect x="14" y="14" width="7" height="7" rx="2" />
            <rect x="3" y="14" width="7" height="7" rx="2" />
          </svg>
        </button>
      </nav>

      {/* Sidebar (basic for now) */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 flex">
          <div className="w-64 bg-black/80 backdrop-blur-lg p-6">
            <button
              className="mb-4 text-white"
              onClick={() => setSidebarOpen(false)}
            >
              Close
            </button>
            {/* Sidebar content goes here */}
            <div className="text-white">Sidebar (to be updated)</div>
          </div>
          <div className="flex-1" onClick={() => setSidebarOpen(false)} />
        </div>
      )}

      {/* Main dashboard content */}
      <main className="pt-20 px-4 max-w-xl mx-auto w-full">
        <WalletDashboard walletAddress={walletAddress} />
      </main>
    </div>
  );
}
