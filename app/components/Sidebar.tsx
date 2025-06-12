"use client";

import { User } from "@privy-io/react-auth";
import { Copy, LogOut, Star, MessageCircle, Globe, Check } from "lucide-react";
import { useState } from "react";

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
  user: User | null;
  onLogout: () => Promise<void>;
  totalValueUsd?: number;
}

export default function Sidebar({
  isOpen,
  onClose,
  walletAddress,
  user,
  onLogout,
  totalValueUsd = 0,
}: SidebarProps) {
  const [copied, setCopied] = useState(false);

  const handleLogout = async () => {
    await onLogout();
    onClose();
  };

  const handleCopyAddress = async () => {
    if (walletAddress) {
      await navigator.clipboard.writeText(walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const formatAddress = (address: string) => {
    if (!address) return "";
    return `${address.slice(0, 4)}...${address.slice(-4)}`;
  };

  const formatNetWorth = (value: number) => {
    return `$${value.toFixed(2)}`;
  };

  return (
    <>
      {/* Backdrop */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
          onClick={onClose}
        />
      )}

      {/* Sidebar - Mobile optimized width */}
      <div
        className={`fixed top-0 left-0 h-full w-[60%] max-w-[320px] min-w-[280px] bg-[#1a1d29] z-50 transform transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="h-full flex flex-col">
          {/* Header Section - Wallet Info */}
          <div className="px-5 pt-10 pb-5">
            {/* W1 Circle and Wallet Name */}
            <div className="flex items-center gap-3 mb-5">
              <div className="w-12 h-12 bg-[#35C2E2] rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">W1</span>
              </div>
            </div>
            <div>
              <h2 className="text-white text-3xl font-medium mb-2">Wallet 1</h2>
            </div>
            {/* Net Worth */}
            <div className="mb-5">
              <h3 className="text-white text-xl font-medium mb-2">
                {formatNetWorth(totalValueUsd)}
              </h3>
            </div>

            {/* Wallet Address */}
            <div className="flex items-center gap-2 mb-5">
              <span className="text-white/70 text-sm font-normal">
                {formatAddress(walletAddress)}
              </span>
              <button
                onClick={handleCopyAddress}
                className="text-[#35C2E2] hover:text-[#35C2E2]/80 transition-colors"
              >
                {copied ? <Check size={14} /> : <Copy size={14} />}
              </button>
            </div>

            {/* Divider Line */}
            <div className="w-full h-px bg-white/10 mb-5"></div>
          </div>

          {/* Menu Items */}
          <div className="flex-1 px-5">
            {/* Menu List */}
            <div className="space-y-1">
              <MenuItem icon="💾" text="Export Wallet" />
              <MenuItem icon="🔍" text="Explorer" />
              <MenuItem icon="🛡️" text="Privacy Policy" />
              <MenuItem icon="📄" text="Terms of Use" />
            </div>
          </div>

          {/* Bottom Section */}
          <div className="px-5 pb-6">
            {/* Logout Button */}
            <button
              onClick={handleLogout}
              className="w-full bg-red-500/10 border border-red-500/30 text-red-400 py-2.5 px-3 rounded-xl font-medium text-sm flex items-center justify-center gap-2 mb-5 transition-colors hover:bg-red-500/20"
            >
              <LogOut size={16} />
              Logout
            </button>

            {/* Action Buttons */}
            <div className="flex gap-2 mb-5">
              <button className="flex-1 bg-[#35C2E2] text-white py-2.5 px-3 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 transition-colors hover:bg-[#35C2E2]/90">
                <Star size={16} />
                Rate Us
              </button>
              <button className="flex-1 bg-[#2a2f3f] text-white py-2.5 px-3 rounded-xl font-medium text-sm flex items-center justify-center gap-1.5 border border-gray-600/30 transition-colors hover:bg-[#2a2f3f]/80">
                <MessageCircle size={16} />
                Get Help
              </button>
            </div>

            {/* Social Icons */}
            <div className="flex justify-center gap-6">
              <SocialIcon href="https://x.com/solanaappkit" label="Twitter">
                {/* X (Twitter) Icon */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </SocialIcon>
              <SocialIcon href="https://t.me/solanaappkit" label="Telegram">
                {/* Telegram Icon */}
                <svg
                  width="18"
                  height="18"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0a12 12 0 0 0-.056 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.48.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </SocialIcon>
              <SocialIcon href="https://www.solanaappkit.com" label="Website">
                {/* Globe Icon */}
                <Globe size={18} />
              </SocialIcon>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// Helper Components
function MenuItem({ icon, text }: { icon: string; text: string }) {
  return (
    <button className="w-full flex items-center gap-3 py-2.5 px-2 text-white hover:bg-white/5 rounded-lg transition-colors">
      <span className="text-base">{icon}</span>
      <span className="text-sm font-normal">{text}</span>
    </button>
  );
}

function SocialIcon({
  children,
  href,
  label,
}: {
  children: React.ReactNode;
  href: string;
  label: string;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-8 h-8 flex items-center justify-center text-[#35C2E2] hover:text-[#35C2E2]/80 transition-colors"
    >
      {children}
    </a>
  );
}
