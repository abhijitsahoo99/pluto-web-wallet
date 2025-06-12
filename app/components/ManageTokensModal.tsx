"use client";

import { useState, useEffect } from "react";
import { X } from "lucide-react";
import { TokenHolding } from "../lib/solana";

interface ManageTokensModalProps {
  isOpen: boolean;
  onClose: () => void;
  solBalance: number;
  solValueUsd: number;
  tokens: TokenHolding[];
  visibleTokens: Set<string>;
  onToggleToken: (tokenMint: string, isVisible: boolean) => void;
}

interface TokenToggleItemProps {
  icon: string;
  name: string;
  balance: string;
  isVisible: boolean;
  onToggle: (isVisible: boolean) => void;
}

const TokenToggleItem = ({
  icon,
  name,
  balance,
  isVisible,
  onToggle,
}: TokenToggleItemProps) => {
  return (
    <div className="flex items-center justify-between py-4 px-6 border-b border-white/10 last:border-b-0">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
          {icon ? (
            <img
              src={icon}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                target.style.display = "none";
                target.nextElementSibling!.classList.remove("hidden");
              }}
            />
          ) : null}
          <div
            className={`w-full h-full flex items-center justify-center text-white font-bold text-sm ${
              icon ? "hidden" : ""
            }`}
          >
            {name.charAt(0)}
          </div>
        </div>
        <div>
          <h3 className="text-white font-semibold text-lg">{name}</h3>
          <p className="text-gray-400 text-sm">{balance}</p>
        </div>
      </div>

      {/* Toggle Switch */}
      <button
        onClick={() => onToggle(!isVisible)}
        className={`relative w-12 h-6 rounded-full transition-colors duration-200 ${
          isVisible ? "bg-[#35C2E2]" : "bg-gray-600"
        }`}
      >
        <div
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform duration-200 ${
            isVisible ? "translate-x-6" : "translate-x-0.5"
          }`}
        />
      </button>
    </div>
  );
};

export default function ManageTokensModal({
  isOpen,
  onClose,
  solBalance,
  solValueUsd,
  tokens,
  visibleTokens,
  onToggleToken,
}: ManageTokensModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const handleClose = () => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
    }, 300);
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  if (!isOpen && !isAnimating) return null;

  return (
    <div
      className={`fixed inset-0 z-50 transition-all duration-300 ${
        isAnimating && isOpen
          ? "bg-black/50 backdrop-blur-sm"
          : "bg-transparent"
      }`}
      onClick={handleBackdropClick}
    >
      <div
        className={`fixed bottom-0 left-0 right-0 bg-[#1a1d29] rounded-t-3xl transition-transform duration-300 ease-out ${
          isAnimating && isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{ maxHeight: "85vh" }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-white/10">
          <div>
            <h2 className="text-white text-2xl font-bold">Manage Tokens</h2>
            <p className="text-gray-400 text-base mt-1">
              Choose which tokens to display
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X size={24} />
          </button>
        </div>

        {/* Token List */}
        <div
          className="overflow-y-auto"
          style={{ maxHeight: "calc(85vh - 120px)" }}
        >
          {/* SOL Token */}
          <TokenToggleItem
            icon="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
            name="SOL"
            balance={`${solBalance.toFixed(4)} SOL`}
            isVisible={visibleTokens.has("SOL")}
            onToggle={(isVisible) => onToggleToken("SOL", isVisible)}
          />

          {/* SPL Tokens */}
          {tokens.map((token) => (
            <TokenToggleItem
              key={token.mint}
              icon={token.logoUri || ""}
              name={token.name || "Unknown Token"}
              balance={`${token.uiAmount.toLocaleString()} ${
                token.symbol || token.mint.slice(0, 6)
              }`}
              isVisible={visibleTokens.has(token.mint)}
              onToggle={(isVisible) => onToggleToken(token.mint, isVisible)}
            />
          ))}

          {/* Empty State */}
          {solBalance === 0 && tokens.length === 0 && (
            <div className="text-center py-12 px-6">
              <p className="text-gray-400 text-base">
                No tokens found in your wallet
              </p>
            </div>
          )}

          {/* Bottom Padding */}
          <div className="h-6" />
        </div>
      </div>
    </div>
  );
}
