"use client";

import { User } from "@privy-io/react-auth";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  user: User | null;
  onLogout: () => Promise<void>;
}

export default function Sidebar({
  isOpen,
  onClose,
  walletAddress,
  user,
  onLogout,
}: SidebarProps) {
  const handleLogout = async () => {
    await onLogout();
    onClose();
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed top-0 right-0 h-full w-80 bg-white/10 backdrop-blur-md border-l border-white/20 z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="p-6 h-full flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-white text-xl font-bold">Wallet Info</h2>
            <button
              onClick={onClose}
              className="text-white/70 hover:text-white transition-colors p-2"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* User Info */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-gradient-to-r from-[#35C2E2] to-[#4F84F5] rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {user?.google?.name?.charAt(0) ||
                    user?.twitter?.name?.charAt(0) ||
                    "U"}
                </span>
              </div>
              <div>
                <h3 className="text-white font-semibold">
                  {user?.google?.name || user?.twitter?.name || "User"}
                </h3>
                <p className="text-white/70 text-sm">
                  {user?.google?.email || user?.twitter?.username || "No email"}
                </p>
              </div>
            </div>
          </div>

          {/* Wallet Address */}
          <div className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4 mb-6">
            <h4 className="text-white font-semibold mb-2">Solana Wallet</h4>
            <div className="bg-white/5 rounded-lg p-3">
              <p className="text-white/70 text-xs font-mono break-all">
                {walletAddress}
              </p>
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(walletAddress)}
              className="mt-2 w-full bg-white/10 hover:bg-white/20 text-white text-sm py-2 px-3 rounded-lg transition-colors"
            >
              Copy Address
            </button>
          </div>

          {/* Spacer */}
          <div className="flex-1"></div>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full bg-red-500/20 hover:bg-red-500/30 text-red-400 font-semibold py-3 px-4 rounded-xl transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    </>
  );
}
