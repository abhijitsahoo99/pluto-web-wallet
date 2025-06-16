"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { X, ChevronDown, RotateCcw, ArrowUpDown } from "lucide-react";
import { TokenHolding } from "../types/solana";
import { connection } from "../lib/solana";
import { usePrivy, useSolanaWallets } from "@privy-io/react-auth";
import { PublicKey, Transaction, VersionedTransaction } from "@solana/web3.js";

interface SwapModalProps {
  isOpen: boolean;
  onClose: () => void;
  solBalance: number;
  tokens: TokenHolding[];
  walletAddress: string;
  defaultFromToken?: string;
  isDesktopMode?: boolean;
}

interface SwapToken {
  mint: string;
  name: string;
  symbol: string;
  balance: number;
  logoUri?: string;
  decimals: number;
  isSOL: boolean;
}

interface TokenSelectorProps {
  isOpen: boolean;
  onClose: () => void;
  selectedToken: SwapToken;
  onSelectToken: (token: SwapToken) => void;
  solBalance: number;
  tokens: TokenHolding[];
  title: string;
}

const TokenSelector = ({
  isOpen,
  onClose,
  selectedToken,
  onSelectToken,
  solBalance,
  tokens,
  title,
}: TokenSelectorProps) => {
  if (!isOpen) return null;

  const handleTokenSelect = (token: SwapToken) => {
    onSelectToken(token);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="fixed bottom-0 left-0 right-0 bg-[#16303e] border border-white/10 rounded-t-3xl max-h-[70vh] overflow-hidden"
        style={{}}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-white text-base font-medium">{title}</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(70vh-80px)]">
          {/* SOL */}
          <button
            onClick={() =>
              handleTokenSelect({
                mint: "So11111111111111111111111111111111111111112",
                name: "SOL",
                symbol: "SOL",
                balance: solBalance,
                logoUri:
                  "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
                decimals: 9,
                isSOL: true,
              })
            }
            className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
          >
            <img
              src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
              alt="SOL"
              className="w-8 h-8 rounded-full"
            />
            <div className="flex-1 text-left">
              <div className="text-white font-medium text-sm">SOL</div>
              <div className="text-gray-400 text-xs">
                Balance: {solBalance.toFixed(6)} SOL
              </div>
            </div>
          </button>

          {/* SPL Tokens */}
          {tokens.map((token) => (
            <button
              key={token.mint}
              onClick={() =>
                handleTokenSelect({
                  mint: token.mint,
                  name: token.name || "Unknown Token",
                  symbol: token.symbol || token.mint.slice(0, 6),
                  balance: token.uiAmount,
                  logoUri: token.logoUri,
                  decimals: token.decimals || 6,
                  isSOL: false,
                })
              }
              className="w-full flex items-center gap-3 p-3 hover:bg-white/5 transition-colors"
            >
              <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
                {token.logoUri ? (
                  <img
                    src={token.logoUri}
                    alt={token.name}
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      target.style.display = "none";
                      target.nextElementSibling!.classList.remove("hidden");
                    }}
                  />
                ) : null}
                <div
                  className={`w-full h-full flex items-center justify-center text-white font-bold text-xs ${
                    token.logoUri ? "hidden" : ""
                  }`}
                >
                  {(token.name || token.symbol || "T").charAt(0)}
                </div>
              </div>
              <div className="flex-1 text-left">
                <div className="text-white font-medium text-sm">
                  {token.name || "Unknown Token"}
                </div>
                <div className="text-gray-400 text-xs">
                  Balance: {token.uiAmount.toLocaleString()}{" "}
                  {token.symbol || token.mint.slice(0, 6)}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default function SwapModal({
  isOpen,
  onClose,
  solBalance,
  tokens,
  walletAddress,
  defaultFromToken,
  isDesktopMode,
}: SwapModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [fromToken, setFromToken] = useState<SwapToken>({
    mint: "So11111111111111111111111111111111111111112",
    name: "SOL",
    symbol: "SOL",
    balance: solBalance,
    logoUri:
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    decimals: 9,
    isSOL: true,
  });
  const [toToken, setToToken] = useState<SwapToken>({
    mint: "EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v", // USDC
    name: "USDC",
    symbol: "USDC",
    balance: 0,
    logoUri:
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v/logo.png",
    decimals: 6,
    isSOL: false,
  });
  const [amount, setAmount] = useState("");
  const [outputAmount, setOutputAmount] = useState("0");
  const [isFromSelectorOpen, setIsFromSelectorOpen] = useState(false);
  const [isToSelectorOpen, setIsToSelectorOpen] = useState(false);
  const [isSwapDetailsOpen, setIsSwapDetailsOpen] = useState(false);
  const [isSwapping, setIsSwapping] = useState(false);
  const [swapQuote, setSwapQuote] = useState<any>(null);
  const [priceImpact, setPriceImpact] = useState<number>(0);
  const [slippageBps, setSlippageBps] = useState<number>(50); // 0.5% default
  const [networkFee, setNetworkFee] = useState<number>(0);
  const [routeInfo, setRouteInfo] = useState<string>("");

  const { user } = usePrivy();
  const { wallets } = useSolanaWallets();

  // Update token balances when props change
  useEffect(() => {
    if (fromToken.isSOL) {
      setFromToken((prev) => ({ ...prev, balance: solBalance }));
    } else {
      const token = tokens.find((t) => t.mint === fromToken.mint);
      if (token) {
        setFromToken((prev) => ({ ...prev, balance: token.uiAmount }));
      }
    }

    if (!toToken.isSOL) {
      const token = tokens.find((t) => t.mint === toToken.mint);
      if (token) {
        setToToken((prev) => ({ ...prev, balance: token.uiAmount }));
      }
    }
  }, [
    solBalance,
    tokens,
    fromToken.mint,
    toToken.mint,
    fromToken.isSOL,
    toToken.isSOL,
  ]);

  // Set default from token when modal opens
  useEffect(() => {
    if (isOpen && defaultFromToken) {
      if (defaultFromToken === "So11111111111111111111111111111111111111112") {
        // SOL
        setFromToken({
          mint: "So11111111111111111111111111111111111111112",
          name: "SOL",
          symbol: "SOL",
          balance: solBalance,
          logoUri:
            "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
          decimals: 9,
          isSOL: true,
        });
      } else {
        // Find the token in the tokens array
        const token = tokens.find((t) => t.mint === defaultFromToken);
        if (token) {
          setFromToken({
            mint: token.mint,
            name: token.name || "Unknown Token",
            symbol: token.symbol || token.mint.slice(0, 6),
            balance: token.uiAmount,
            logoUri: token.logoUri,
            decimals: token.decimals || 6,
            isSOL: false,
          });
        }
      }
    }
  }, [isOpen, defaultFromToken, solBalance, tokens]);

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

  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
      setAmount("");
      setOutputAmount("0");
      setSwapQuote(null);
    }, 300);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleSwapTokens = () => {
    const tempToken = fromToken;
    setFromToken(toToken);
    setToToken(tempToken);
    setAmount("");
    setOutputAmount("0");
    setSwapQuote(null);
  };

  const handleNumberInput = (value: string) => {
    if (value === "CLR") {
      setAmount("");
      setOutputAmount("0");
      setSwapQuote(null);
      return;
    }

    if (value === "⌫") {
      setAmount((prev) => prev.slice(0, -1));
      return;
    }

    if (value === "MAX") {
      setAmount(fromToken.balance.toString());
      return;
    }

    if (value === "75%") {
      setAmount((fromToken.balance * 0.75).toString());
      return;
    }

    if (value === "50%") {
      setAmount((fromToken.balance * 0.5).toString());
      return;
    }

    if (value === "." && amount.includes(".")) return;

    setAmount((prev) => prev + value);
  };

  // Calculate USD values
  const fromTokenUsdValue = useMemo(() => {
    if (!amount || !fromToken.balance) return 0;
    // You can integrate with a price API here, for now using placeholder
    return parseFloat(amount) * 0; // Replace with actual price calculation
  }, [amount, fromToken]);

  const toTokenUsdValue = useMemo(() => {
    if (!outputAmount || outputAmount === "0") return 0;
    // You can integrate with a price API here, for now using placeholder
    return parseFloat(outputAmount) * 0; // Replace with actual price calculation
  }, [outputAmount, toToken]);

  // Get swap quote from Jupiter
  const getSwapQuote = useCallback(
    async (inputAmount: string) => {
      if (!inputAmount || parseFloat(inputAmount) <= 0) {
        setOutputAmount("0");
        setSwapQuote(null);
        setNetworkFee(0);
        setRouteInfo("");
        return;
      }

      try {
        const inputAmountLamports = Math.floor(
          parseFloat(inputAmount) * Math.pow(10, fromToken.decimals)
        );

        const response = await fetch(
          `https://quote-api.jup.ag/v6/quote?inputMint=${fromToken.mint}&outputMint=${toToken.mint}&amount=${inputAmountLamports}&slippageBps=${slippageBps}`
        );

        if (!response.ok) {
          throw new Error("Failed to get quote");
        }

        const quote = await response.json();
        setSwapQuote(quote);

        const outputAmountUI =
          parseFloat(quote.outAmount) / Math.pow(10, toToken.decimals);
        setOutputAmount(outputAmountUI.toFixed(6));

        // Calculate price impact
        if (quote.priceImpactPct) {
          setPriceImpact(parseFloat(quote.priceImpactPct));
        }

        // Set network fee (Jupiter provides this in the quote)
        if (quote.contextSlot || quote.timeTaken) {
          setNetworkFee(0.000005); // Typical Solana transaction fee
        }

        // Set route information
        if (quote.routePlan && quote.routePlan.length > 0) {
          const dexNames = quote.routePlan
            .map((step: any) => step.swapInfo?.label || "Unknown DEX")
            .join(" → ");
          setRouteInfo(dexNames);
        }
      } catch (error) {
        console.error("Error getting swap quote:", error);
        setOutputAmount("0");
        setSwapQuote(null);
        setNetworkFee(0);
        setRouteInfo("");
      }
    },
    [fromToken, toToken, slippageBps]
  );

  // Debounced quote fetching
  useEffect(() => {
    const timer = setTimeout(() => {
      if (amount) {
        getSwapQuote(amount);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [amount, getSwapQuote]);

  const handleSwap = async () => {
    if (!swapQuote || !user || !amount) return;

    setIsSwapping(true);

    try {
      // Get swap transaction from Jupiter
      const response = await fetch("https://quote-api.jup.ag/v6/swap", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          quoteResponse: swapQuote,
          userPublicKey: walletAddress,
          wrapAndUnwrapSol: true,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to get swap transaction");
      }

      const { swapTransaction } = await response.json();

      // Deserialize the transaction
      const transactionBuf = Buffer.from(swapTransaction, "base64");
      const transaction = VersionedTransaction.deserialize(transactionBuf);

      // Get the Solana wallet from Privy wallets
      const solanaWallet = wallets.find(
        (wallet) => wallet.address === walletAddress
      );

      if (!solanaWallet) {
        throw new Error("No Solana wallet found");
      }

      // Sign and send the transaction
      const signedTransaction = await solanaWallet.signTransaction(transaction);

      if (!signedTransaction) {
        throw new Error("Failed to sign transaction");
      }

      const txSignature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        }
      );

      console.log("Swap transaction sent:", txSignature);

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(
        txSignature,
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error(`Swap failed: ${confirmation.value.err}`);
      }

      console.log("Swap confirmed!");

      // Reset form and close modal
      setAmount("");
      setOutputAmount("0");
      setSwapQuote(null);
      handleClose();

      // Refresh wallet data
      setTimeout(() => {
        window.location.reload();
      }, 2000);
    } catch (error) {
      console.error("Swap failed:", error);
      alert(
        `Swap failed: ${
          error instanceof Error ? error.message : "Unknown error"
        }`
      );
    } finally {
      setIsSwapping(false);
    }
  };

  const canSwap = useMemo(() => {
    return (
      amount !== "" &&
      parseFloat(amount) > 0 &&
      parseFloat(amount) <= fromToken.balance &&
      swapQuote &&
      !isSwapping
    );
  }, [amount, fromToken.balance, swapQuote, isSwapping]);

  if (!isOpen) return null;

  const modalContent = (
    <div
      className={`${
        isDesktopMode ? "" : "fixed inset-0 z-50 flex items-end justify-center"
      }`}
    >
      {!isDesktopMode && (
        <div
          className="absolute inset-0 bg-black/50 backdrop-blur-sm"
          onClick={handleClose}
        />
      )}

      <div
        className={`
        ${
          isDesktopMode
            ? "w-full"
            : `relative w-full max-w-md mx-4 mb-4 transform transition-all duration-300 ease-out ${
                isAnimating
                  ? "translate-y-0 opacity-100"
                  : "translate-y-full opacity-0"
              }`
        }
      `}
      >
        <div
          className={`
          bg-black/90 backdrop-blur-xl border border-white/20 
          ${isDesktopMode ? "rounded-2xl" : "rounded-3xl"} 
          overflow-hidden shadow-2xl
        `}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-white/10">
            <h2 className="text-xl font-bold text-white">Swap</h2>
            {!isDesktopMode && (
              <button
                onClick={handleClose}
                className="p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={20} className="text-gray-400" />
              </button>
            )}
          </div>

          <div
            className="overflow-y-auto p-3 space-y-2"
            style={{
              maxHeight: isDesktopMode ? "500px" : "calc(95vh - 120px)",
              minHeight: isDesktopMode ? "500px" : "auto",
            }}
          >
            {/* Swap Cards Container */}
            <div className="bg-[#0C1F2D] rounded-2xl p-2 border border-white/10">
              <div className="relative">
                {/* You Pay Card */}
                <div className="bg-[#16303e] border border-white/10 rounded-xl p-2 mb-3">
                  <div className="flex items-center justify-between">
                    {/* Left side - Token info */}
                    <button
                      onClick={() => setIsFromSelectorOpen(true)}
                      className="flex items-center gap-2 hover:bg-white/5 rounded-lg p-1 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden flex items-center justify-center">
                        {fromToken.logoUri ? (
                          <img
                            src={fromToken.logoUri}
                            alt={fromToken.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-white font-bold text-xs">
                            {fromToken.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <div className="text-white font-bold text-base">
                          {fromToken.symbol}
                        </div>
                        <div className="text-gray-400 text-xs">
                          Balance: {fromToken.balance.toFixed(6)}...
                        </div>
                      </div>
                      <ChevronDown size={14} className="text-gray-400" />
                    </button>

                    {/* Right side - You Pay label and amount */}
                    <div className="text-right">
                      <div className="text-gray-400 text-xs mb-1">You Pay</div>
                      <div className="text-white text-lg font-bold">
                        {amount || "0"}
                      </div>
                      <div className="text-gray-400 text-xs">
                        {fromTokenUsdValue > 0
                          ? `$${fromTokenUsdValue.toFixed(2)}`
                          : "$0.00"}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Swap Button - Positioned to overlap both cards */}
                <div className="flex justify-center relative z-10 -my-3">
                  <button
                    onClick={handleSwapTokens}
                    className="w-8 h-8 bg-gray-800 border-2 border-gray-600 rounded-full flex items-center justify-center hover:bg-gray-700 transition-colors shadow-lg"
                  >
                    <ArrowUpDown size={14} className="text-white" />
                  </button>
                </div>

                {/* You Receive Card */}
                <div className="bg-[#16303e] border border-white/10 rounded-xl p-2">
                  <div className="flex items-center justify-between">
                    {/* Left side - Token info */}
                    <button
                      onClick={() => setIsToSelectorOpen(true)}
                      className="flex items-center gap-2 hover:bg-white/5 rounded-lg p-1 transition-colors"
                    >
                      <div className="w-8 h-8 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
                        {toToken.logoUri ? (
                          <img
                            src={toToken.logoUri}
                            alt={toToken.name}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="text-white font-bold text-xs">
                            {toToken.name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <div className="text-left">
                        <div className="text-white font-bold text-base">
                          {toToken.symbol}
                        </div>
                      </div>
                      <ChevronDown size={14} className="text-gray-400" />
                    </button>

                    {/* Right side - You Receive label and amount */}
                    <div className="text-right">
                      <div className="text-gray-400 text-xs mb-1">
                        You Receive
                      </div>
                      <div className="text-[#35C2E2] text-lg font-bold">
                        +{outputAmount}
                      </div>
                      <div className="text-gray-400 text-xs">
                        {toTokenUsdValue > 0
                          ? `$${toTokenUsdValue.toFixed(2)}`
                          : "$0.00"}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Swap Details */}
            <button
              onClick={() => setIsSwapDetailsOpen(!isSwapDetailsOpen)}
              className="w-full bg-[#0c1f2d] border border-white/10 rounded-2xl p-2 py-4 flex items-center justify-between hover:bg-[#0c1f2d]/80 transition-colors"
            >
              <span className="text-white font-medium text-sm">
                Swap Details
              </span>
              <ChevronDown
                size={14}
                className={`text-gray-400 transition-transform ${
                  isSwapDetailsOpen ? "rotate-180" : ""
                }`}
              />
            </button>

            {isSwapDetailsOpen && (
              <div className="bg-[#0c1f2d] border border-white/10 rounded-2xl p-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Rate</span>
                  <span className="text-white">
                    1 {fromToken.symbol} ≈{" "}
                    {swapQuote
                      ? (
                          parseFloat(outputAmount) / parseFloat(amount || "1")
                        ).toFixed(6)
                      : "0"}{" "}
                    {toToken.symbol}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Price Impact</span>
                  <span
                    className={`${
                      priceImpact > 1
                        ? "text-red-400"
                        : priceImpact > 0.1
                        ? "text-yellow-400"
                        : "text-green-400"
                    }`}
                  >
                    {priceImpact > 0 ? `${priceImpact.toFixed(2)}%` : "< 0.01%"}
                  </span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Slippage Tolerance</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setSlippageBps(25)}
                      className={`px-2 py-1 rounded text-xs ${
                        slippageBps === 25
                          ? "bg-cyan-400/20 text-cyan-400"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      0.25%
                    </button>
                    <button
                      onClick={() => setSlippageBps(50)}
                      className={`px-2 py-1 rounded text-xs ${
                        slippageBps === 50
                          ? "bg-cyan-400/20 text-cyan-400"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      0.5%
                    </button>
                    <button
                      onClick={() => setSlippageBps(100)}
                      className={`px-2 py-1 rounded text-xs ${
                        slippageBps === 100
                          ? "bg-cyan-400/20 text-cyan-400"
                          : "text-gray-400 hover:text-white"
                      }`}
                    >
                      1%
                    </button>
                  </div>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Network Fee</span>
                  <span className="text-white">
                    ~{networkFee.toFixed(6)} SOL
                  </span>
                </div>
                {routeInfo && (
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-400">Route</span>
                    <span className="text-white text-right max-w-[60%] truncate">
                      {routeInfo}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-xs">
                  <span className="text-gray-400">Minimum Received</span>
                  <span className="text-white">
                    {swapQuote
                      ? (
                          parseFloat(outputAmount) *
                          (1 - slippageBps / 10000)
                        ).toFixed(6)
                      : "0"}{" "}
                    {toToken.symbol}
                  </span>
                </div>
              </div>
            )}

            {/* Swap Button */}
            <div className="space-y-3">
              {/* Amount Input - Desktop Only */}
              {isDesktopMode && (
                <div>
                  <label className="block text-gray-400 text-sm mb-2">
                    Enter Amount
                  </label>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "" || /^\d*\.?\d*$/.test(value)) {
                        setAmount(value);
                      }
                    }}
                    placeholder="0.0"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-2 text-white placeholder-gray-500 focus:outline-none focus:border-[#35C2E2] transition-colors text-center text-lg font-medium"
                  />
                </div>
              )}

              {/* Percentage Buttons Row - Desktop Only */}
              {isDesktopMode && (
                <div className="flex gap-2">
                  <button
                    onClick={() =>
                      setAmount((fromToken.balance * 0.25).toString())
                    }
                    className="flex-1 py-1.5 bg-transparent border border-[#35C2E2]/50 text-[#35C2E2] rounded-xl font-medium text-sm hover:bg-[#35C2E2]/10 transition-colors"
                  >
                    25%
                  </button>
                  <button
                    onClick={() =>
                      setAmount((fromToken.balance * 0.5).toString())
                    }
                    className="flex-1 py-1.5 bg-transparent border border-[#35C2E2]/50 text-[#35C2E2] rounded-xl font-medium text-sm hover:bg-[#35C2E2]/10 transition-colors"
                  >
                    50%
                  </button>
                  <button
                    onClick={() =>
                      setAmount((fromToken.balance * 0.75).toString())
                    }
                    className="flex-1 py-1.5 bg-transparent border border-[#35C2E2]/50 text-[#35C2E2] rounded-xl font-medium text-sm hover:bg-[#35C2E2]/10 transition-colors"
                  >
                    75%
                  </button>
                  <button
                    onClick={() => setAmount(fromToken.balance.toString())}
                    className="flex-1 py-1.5 bg-transparent border border-[#35C2E2]/50 text-[#35C2E2] rounded-xl font-medium text-sm hover:bg-[#35C2E2]/10 transition-colors"
                  >
                    MAX
                  </button>
                </div>
              )}

              <button
                onClick={handleSwap}
                disabled={!canSwap}
                className={`w-full py-2.5 rounded-2xl font-medium text-base transition-all ${
                  canSwap
                    ? "bg-gray-300 text-black hover:bg-gray-200"
                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                }`}
              >
                {isSwapping ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-4 h-4 border-2 border-gray-600 border-t-transparent rounded-full animate-spin" />
                    Swapping...
                  </div>
                ) : (
                  "Swap"
                )}
              </button>
            </div>

            {/* Numeric Keypad - Mobile Only */}
            {!isDesktopMode && (
              <div className="grid grid-cols-4 gap-2 mt-3">
                {/* Left Column - Special Buttons */}
                <div className="space-y-2">
                  <button
                    onClick={() => handleNumberInput("MAX")}
                    className="w-full h-10 bg-transparent border-2 border-cyan-400 text-cyan-400 rounded-xl font-medium text-xs hover:bg-cyan-400/10 transition-colors"
                  >
                    MAX
                  </button>
                  <button
                    onClick={() => handleNumberInput("75%")}
                    className="w-full h-10 bg-transparent border-2 border-cyan-400 text-cyan-400 rounded-xl font-medium text-xs hover:bg-cyan-400/10 transition-colors"
                  >
                    75%
                  </button>
                  <button
                    onClick={() => handleNumberInput("50%")}
                    className="w-full h-10 bg-transparent border-2 border-cyan-400 text-cyan-400 rounded-xl font-medium text-xs hover:bg-cyan-400/10 transition-colors"
                  >
                    50%
                  </button>
                  <button
                    onClick={() => handleNumberInput("CLR")}
                    className="w-full h-10 bg-transparent border-2 border-cyan-400 text-cyan-400 rounded-xl font-medium text-xs hover:bg-cyan-400/10 transition-colors"
                  >
                    CLR
                  </button>
                </div>

                {/* Numbers Grid */}
                <div className="col-span-3 grid grid-cols-3 gap-2">
                  {[
                    "1",
                    "2",
                    "3",
                    "4",
                    "5",
                    "6",
                    "7",
                    "8",
                    "9",
                    ".",
                    "0",
                    "⌫",
                  ].map((key) => (
                    <button
                      key={key}
                      onClick={() => handleNumberInput(key)}
                      className="h-10 bg-transparent text-white text-lg font-normal hover:bg-white/10 rounded-xl transition-colors flex items-center justify-center"
                    >
                      {key}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Bottom Padding */}
            <div className="h-1" />
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {modalContent}

      {/* Token Selectors */}
      <TokenSelector
        isOpen={isFromSelectorOpen}
        onClose={() => setIsFromSelectorOpen(false)}
        selectedToken={fromToken}
        onSelectToken={setFromToken}
        solBalance={solBalance}
        tokens={tokens}
        title="Select token to pay"
      />

      <TokenSelector
        isOpen={isToSelectorOpen}
        onClose={() => setIsToSelectorOpen(false)}
        selectedToken={toToken}
        onSelectToken={setToToken}
        solBalance={solBalance}
        tokens={tokens}
        title="Select token to receive"
      />
    </>
  );
}
