"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { X, Check } from "lucide-react";
import { TokenHolding, connection } from "../lib/solana";
import { usePrivy, useSolanaWallets } from "@privy-io/react-auth";
import {
  Connection,
  PublicKey,
  Transaction,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  createTransferInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";

interface SendModalProps {
  isOpen: boolean;
  onClose: () => void;
  solBalance: number;
  solValueUsd: number;
  tokens: TokenHolding[];
  walletAddress: string;
}

interface SelectedToken {
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
  selectedToken: SelectedToken;
  onSelectToken: (token: SelectedToken) => void;
  solBalance: number;
  tokens: TokenHolding[];
}

const TokenSelector = ({
  isOpen,
  onClose,
  selectedToken,
  onSelectToken,
  solBalance,
  tokens,
}: TokenSelectorProps) => {
  if (!isOpen) return null;

  const handleTokenSelect = (token: SelectedToken) => {
    onSelectToken(token);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[60] bg-black/50 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="fixed bottom-0 left-0 right-0 bg-black/20 backdrop-blur-xl border border-white/10 rounded-t-3xl max-h-[70vh] overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(26, 35, 50, 0.95) 0%, rgba(30, 42, 58, 0.95) 50%, rgba(36, 49, 66, 0.95) 100%)",
          backdropFilter: "blur(20px)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center justify-between">
            <h3 className="text-white text-lg font-medium">Select Token</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="overflow-y-auto max-h-[calc(70vh-80px)]">
          {/* SOL */}
          <button
            onClick={() =>
              handleTokenSelect({
                mint: "SOL",
                name: "SOL",
                symbol: "SOL",
                balance: solBalance,
                logoUri:
                  "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
                decimals: 9,
                isSOL: true,
              })
            }
            className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
          >
            <img
              src="https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png"
              alt="SOL"
              className="w-10 h-10 rounded-full"
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
              className="w-full flex items-center gap-4 p-4 hover:bg-white/5 transition-colors"
            >
              <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
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

// Success/Error Animation Component
const TransactionStatus = ({
  isVisible,
  isSuccess,
  message,
  onClose,
}: {
  isVisible: boolean;
  isSuccess: boolean;
  message: string;
  onClose: () => void;
}) => {
  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center">
      <div
        className="rounded-3xl p-8 max-w-sm mx-4 relative border border-white/10"
        style={{
          background:
            "linear-gradient(135deg, rgba(26, 35, 50, 0.95) 0%, rgba(30, 42, 58, 0.95) 50%, rgba(36, 49, 66, 0.95) 100%)",
          backdropFilter: "blur(20px)",
        }}
      >
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${
              isSuccess ? "bg-green-500" : "bg-red-500"
            }`}
          >
            {isSuccess ? (
              <Check size={28} className="text-white" />
            ) : (
              <X size={28} className="text-white" />
            )}
          </div>
          <h3 className="text-white text-base font-medium mb-2">
            {isSuccess ? "Transaction Successful" : "Transaction Failed"}
          </h3>
          <p className="text-gray-400 text-xs">{message}</p>
        </div>
      </div>
    </div>
  );
};

export default function SendModal({
  isOpen,
  onClose,
  solBalance,
  solValueUsd,
  tokens,
  walletAddress,
}: SendModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [selectedToken, setSelectedToken] = useState<SelectedToken>({
    mint: "SOL",
    name: "SOL",
    symbol: "SOL",
    balance: solBalance,
    logoUri:
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    decimals: 9,
    isSOL: true,
  });
  const [recipientAddress, setRecipientAddress] = useState("");
  const [amount, setAmount] = useState("");
  const [isTokenSelectorOpen, setIsTokenSelectorOpen] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [showStatus, setShowStatus] = useState(false);
  const [transactionSuccess, setTransactionSuccess] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [pasteSuccess, setPasteSuccess] = useState(false);

  const { user } = usePrivy();
  const { wallets } = useSolanaWallets();

  // Update selected token balance when props change
  useEffect(() => {
    if (selectedToken.isSOL) {
      setSelectedToken((prev) => ({ ...prev, balance: solBalance }));
    } else {
      const token = tokens.find((t) => t.mint === selectedToken.mint);
      if (token) {
        setSelectedToken((prev) => ({ ...prev, balance: token.uiAmount }));
      }
    }
  }, [solBalance, tokens, selectedToken.mint, selectedToken.isSOL]);

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
      // Reset form
      setRecipientAddress("");
      setAmount("");
      setSendError(null);
      setShowStatus(false);
      setPasteSuccess(false);
    }, 300);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handlePaste = async () => {
    // Simple validation - check if current input is a valid Solana address
    if (
      recipientAddress.trim() &&
      isValidSolanaAddress(recipientAddress.trim())
    ) {
      setPasteSuccess(true);
      setTimeout(() => setPasteSuccess(false), 2000);
    } else {
      setPasteSuccess(false);
      // Could show error state briefly if needed
    }
  };

  const handleAmountSelect = (value: number) => {
    setAmount(value.toString());
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Only allow numbers, decimal point, and empty string
    if (value === "" || /^\d*\.?\d*$/.test(value)) {
      setAmount(value);
    }
  };

  const isValidSolanaAddress = (address: string): boolean => {
    try {
      new PublicKey(address);
      return true;
    } catch {
      return false;
    }
  };

  const canSend = useMemo(() => {
    return (
      recipientAddress.trim() !== "" &&
      isValidSolanaAddress(recipientAddress) &&
      amount !== "" &&
      parseFloat(amount) > 0 &&
      parseFloat(amount) <= selectedToken.balance &&
      !isSending
    );
  }, [recipientAddress, amount, selectedToken.balance, isSending]);

  const handleSend = async () => {
    if (!canSend || !user) return;

    setIsSending(true);
    setSendError(null);

    try {
      // Use the existing Helius connection from lib/solana.ts
      console.log("Using Helius RPC connection...");

      // Test the connection
      await connection.getSlot();
      console.log("Successfully connected to Helius RPC");

      const fromPubkey = new PublicKey(walletAddress);
      const toPubkey = new PublicKey(recipientAddress);
      const sendAmount = parseFloat(amount);

      console.log("Creating real transaction...");
      console.log("From:", fromPubkey.toString());
      console.log("To:", toPubkey.toString());
      console.log("Amount:", sendAmount, selectedToken.symbol);

      let transaction = new Transaction();

      if (selectedToken.isSOL) {
        // Send SOL
        const lamports = Math.floor(sendAmount * LAMPORTS_PER_SOL);

        // Check if sender has enough balance
        const balance = await connection.getBalance(fromPubkey);
        if (balance < lamports) {
          throw new Error("Insufficient SOL balance");
        }

        transaction.add(
          SystemProgram.transfer({
            fromPubkey,
            toPubkey,
            lamports,
          })
        );
      } else {
        // Send SPL Token
        const mintPubkey = new PublicKey(selectedToken.mint);
        const fromTokenAccount = await getAssociatedTokenAddress(
          mintPubkey,
          fromPubkey
        );
        const toTokenAccount = await getAssociatedTokenAddress(
          mintPubkey,
          toPubkey
        );

        const tokenAmount = Math.floor(
          sendAmount * Math.pow(10, selectedToken.decimals)
        );

        // Check if token account exists for recipient, if not create it
        const toAccountInfo = await connection.getAccountInfo(toTokenAccount);
        if (!toAccountInfo) {
          transaction.add(
            createAssociatedTokenAccountInstruction(
              fromPubkey, // payer
              toTokenAccount, // associated token account
              toPubkey, // owner
              mintPubkey // mint
            )
          );
        }

        transaction.add(
          createTransferInstruction(
            fromTokenAccount,
            toTokenAccount,
            fromPubkey,
            tokenAmount,
            [],
            TOKEN_PROGRAM_ID
          )
        );
      }

      // Get recent blockhash
      const { blockhash, lastValidBlockHeight } =
        await connection.getLatestBlockhash("confirmed");
      transaction.recentBlockhash = blockhash;
      transaction.feePayer = fromPubkey;

      console.log("Transaction prepared, requesting signature...");

      // Get the Solana wallet from Privy wallets
      const solanaWallet = wallets.find(
        (wallet) => wallet.address === walletAddress
      );

      if (!solanaWallet) {
        throw new Error("No Solana wallet found");
      }

      console.log("Signing transaction with Privy wallet...");

      // Use Privy's signTransaction method
      const signedTransaction = await solanaWallet.signTransaction(transaction);

      if (!signedTransaction) {
        throw new Error("Failed to sign transaction");
      }

      console.log("Transaction signed, sending to network...");

      // Send the signed transaction
      const txSignature = await connection.sendRawTransaction(
        signedTransaction.serialize(),
        {
          skipPreflight: false,
          preflightCommitment: "confirmed",
        }
      );

      console.log("Transaction sent:", txSignature);

      // Wait for confirmation
      const confirmation = await connection.confirmTransaction(
        {
          signature: txSignature,
          blockhash,
          lastValidBlockHeight,
        },
        "confirmed"
      );

      if (confirmation.value.err) {
        throw new Error(`Transaction failed: ${confirmation.value.err}`);
      }

      console.log("Transaction confirmed!");

      setIsSending(false);
      setTransactionSuccess(true);
      setStatusMessage(
        `Successfully sent ${amount} ${
          selectedToken.symbol
        } to ${recipientAddress.slice(0, 8)}...${recipientAddress.slice(-8)}`
      );
      setShowStatus(true);

      // Clear form
      setRecipientAddress("");
      setAmount("");
      setPasteSuccess(false);

      // Trigger a refresh of wallet data to update balances
      // This will cause the parent component to refetch balances
      setTimeout(() => {
        window.location.reload(); // Simple way to refresh balances
      }, 2000);
    } catch (error) {
      console.error("Send failed:", error);
      setIsSending(false);
      setTransactionSuccess(false);
      setStatusMessage(
        error instanceof Error ? error.message : "Transaction failed"
      );
      setShowStatus(true);
    }
  };

  if (!isOpen && !isAnimating) return null;

  return (
    <>
      <div
        className={`fixed inset-0 z-50 transition-all duration-300 ${
          isAnimating && isOpen
            ? "bg-black/50 backdrop-blur-sm"
            : "bg-transparent"
        }`}
        onClick={handleBackdropClick}
      >
        <div
          className={`fixed bottom-0 left-0 right-0 rounded-t-3xl transition-transform duration-300 ease-out border border-white/10 ${
            isAnimating && isOpen ? "translate-y-0" : "translate-y-full"
          }`}
          style={{
            maxHeight: "90vh",
            background:
              "linear-gradient(135deg, rgba(26, 35, 50, 0.95) 0%, rgba(30, 42, 58, 0.95) 50%, rgba(36, 49, 66, 0.95) 100%)",
            backdropFilter: "blur(20px)",
          }}
        >
          {/* Header */}
          <div className="flex items-center justify-center p-6 border-b border-white/10 relative">
            <div className="w-12 h-1 bg-white/20 rounded-full absolute top-3" />
            <h2 className="text-white text-lg font-medium">
              Send {selectedToken.symbol}
            </h2>
            <button
              onClick={handleClose}
              className="absolute right-6 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>

          <div
            className="overflow-y-auto p-6 space-y-4"
            style={{ maxHeight: "calc(90vh - 120px)" }}
          >
            {/* Selected Token */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-700 flex items-center justify-center">
                    {selectedToken.logoUri ? (
                      <img
                        src={selectedToken.logoUri}
                        alt={selectedToken.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="text-white font-bold text-xs">
                        {selectedToken.name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div>
                    <div className="text-white font-medium text-sm">
                      {selectedToken.symbol}
                    </div>
                    <div className="text-gray-400 text-xs">
                      Balance: {selectedToken.balance.toLocaleString()}{" "}
                      {selectedToken.symbol}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setIsTokenSelectorOpen(true)}
                  className="px-4 py-2 bg-[#35C2E2] text-white rounded-full font-medium hover:bg-[#35C2E2]/90 transition-colors text-xs"
                >
                  Change
                </button>
              </div>
            </div>

            {/* Recipient Address */}
            <div>
              <label className="block text-white font-normal text-sm mb-2">
                Recipient Wallet Address
              </label>
              <div className="relative">
                <input
                  type="text"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  placeholder="Enter Solana wallet address"
                  className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-3 pr-20 text-white placeholder-gray-500 focus:outline-none focus:border-[#35C2E2] transition-colors text-sm caret-white"
                  style={{ fontSize: "16px" }} // Prevents zoom on iOS
                />
                <button
                  onClick={handlePaste}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 px-3 py-1.5 rounded-full text-xs font-normal transition-all ${
                    pasteSuccess
                      ? "bg-green-500 text-white"
                      : "bg-[#35C2E2] text-white hover:bg-[#35C2E2]/90"
                  }`}
                >
                  {pasteSuccess ? "✓" : "Paste"}
                </button>
              </div>
              {recipientAddress && !isValidSolanaAddress(recipientAddress) && (
                <p className="text-red-400 text-xs mt-1">
                  Invalid Solana address
                </p>
              )}
            </div>

            {/* Amount */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-white font-normal text-sm">
                  Amount ({selectedToken.symbol})
                </label>
                <button
                  onClick={() => setAmount(selectedToken.balance.toString())}
                  className="text-[#35C2E2] font-normal hover:text-[#35C2E2]/80 transition-colors text-sm"
                >
                  MAX
                </button>
              </div>

              {/* Quick Amount Selection */}
              <div className="flex gap-3 mb-3">
                {[1, 5, 10].map((value) => (
                  <button
                    key={value}
                    onClick={() => handleAmountSelect(value)}
                    className="flex-1 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white font-normal hover:bg-white/10 transition-colors text-sm h-10"
                  >
                    {value} {selectedToken.symbol}
                  </button>
                ))}
              </div>

              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={handleAmountChange}
                placeholder="0"
                className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-[#35C2E2] transition-colors text-center text-sm font-normal caret-white h-10"
                style={{ fontSize: "16px" }} // Prevents zoom on iOS
              />
              {amount && parseFloat(amount) > selectedToken.balance && (
                <p className="text-red-400 text-xs mt-1">
                  Insufficient balance
                </p>
              )}
            </div>

            {/* Error Message */}
            {sendError && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3">
                <p className="text-red-400 text-xs">{sendError}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-4 pt-4">
              <button
                onClick={handleClose}
                className="flex-1 py-3 bg-white/10 text-white rounded-2xl font-normal hover:bg-white/15 transition-colors text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleSend}
                disabled={!canSend}
                className={`flex-1 py-3 rounded-2xl font-normal transition-all text-sm ${
                  canSend
                    ? "bg-[#35C2E2] text-white hover:bg-[#35C2E2]/90"
                    : "bg-gray-600 text-gray-400 cursor-not-allowed"
                }`}
              >
                {isSending ? (
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Sending...
                  </div>
                ) : (
                  "Send"
                )}
              </button>
            </div>

            {/* Bottom Padding */}
            <div className="h-2" />
          </div>
        </div>
      </div>

      {/* Token Selector Modal */}
      <TokenSelector
        isOpen={isTokenSelectorOpen}
        onClose={() => setIsTokenSelectorOpen(false)}
        selectedToken={selectedToken}
        onSelectToken={setSelectedToken}
        solBalance={solBalance}
        tokens={tokens}
      />

      {/* Transaction Status Modal */}
      <TransactionStatus
        isVisible={showStatus}
        isSuccess={transactionSuccess}
        message={statusMessage}
        onClose={() => setShowStatus(false)}
      />
    </>
  );
}
