"use client";

import { useState, useEffect, useCallback } from "react";
import { X, Copy, Share, Check } from "lucide-react";
import QRCode from "qrcode";

interface ReceiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  walletAddress: string;
}

export default function ReceiveModal({
  isOpen,
  onClose,
  walletAddress,
}: ReceiveModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>("");
  const [copySuccess, setCopySuccess] = useState(false);

  // Truncate wallet address for display
  const truncatedAddress = walletAddress
    ? `${walletAddress.slice(0, 12)}...${walletAddress.slice(-12)}`
    : "";

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = "hidden";

      // Generate QR code
      if (walletAddress) {
        QRCode.toDataURL(walletAddress, {
          width: 280,
          margin: 2,
          color: {
            dark: "#000000",
            light: "#FFFFFF",
          },
        })
          .then((url: string) => setQrCodeUrl(url))
          .catch((err: Error) =>
            console.error("QR Code generation failed:", err)
          );
      }
    } else {
      document.body.style.overflow = "unset";
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen, walletAddress]);

  const handleClose = useCallback(() => {
    setIsAnimating(false);
    setTimeout(() => {
      onClose();
      setCopySuccess(false);
    }, 300);
  }, [onClose]);

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      handleClose();
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(walletAddress);
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    } catch (error) {
      console.error("Failed to copy:", error);
    }
  };

  const createShareableImage = async (): Promise<Blob> => {
    return new Promise((resolve, reject) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        reject(new Error("Could not get canvas context"));
        return;
      }

      // Set canvas size
      canvas.width = 400;
      canvas.height = 600;

      // Background
      ctx.fillStyle = "#1a2332";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Title
      ctx.fillStyle = "#ffffff";
      ctx.font = "bold 24px Arial";
      ctx.textAlign = "center";
      ctx.fillText("Receive Funds", canvas.width / 2, 50);

      // Load and draw QR code
      const qrImg = new Image();
      qrImg.onload = () => {
        // Draw QR code
        const qrSize = 280;
        const qrX = (canvas.width - qrSize) / 2;
        const qrY = 80;

        // White background for QR code
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(qrX - 10, qrY - 10, qrSize + 20, qrSize + 20);

        ctx.drawImage(qrImg, qrX, qrY, qrSize, qrSize);

        // Description text
        ctx.fillStyle = "#9ca3af";
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText(
          "Scan this QR code to receive",
          canvas.width / 2,
          qrY + qrSize + 40
        );
        ctx.fillText("SOL and SPL tokens", canvas.width / 2, qrY + qrSize + 65);

        // Wallet address
        ctx.fillStyle = "#ffffff";
        ctx.font = "14px monospace";
        ctx.fillText(truncatedAddress, canvas.width / 2, qrY + qrSize + 100);

        // Security notice
        ctx.fillStyle = "#9ca3af";
        ctx.font = "12px Arial";
        ctx.fillText(
          "Only share this address with trusted sources",
          canvas.width / 2,
          qrY + qrSize + 130
        );

        // Convert to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error("Failed to create image blob"));
          }
        }, "image/png");
      };

      qrImg.onerror = () => reject(new Error("Failed to load QR code"));
      qrImg.src = qrCodeUrl;
    });
  };

  const handleShare = async () => {
    try {
      if (navigator.share && qrCodeUrl) {
        // Create shareable image
        const imageBlob = await createShareableImage();
        const file = new File([imageBlob], "solana-wallet-qr.png", {
          type: "image/png",
        });

        await navigator.share({
          title: "My Solana Wallet Address",
          text: `Send SOL and SPL tokens to: ${walletAddress}`,
          files: [file],
        });
      } else {
        // Fallback to copying address
        await handleCopy();
      }
    } catch (error) {
      console.error("Failed to share:", error);
      // Fallback to copying address
      await handleCopy();
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
          <h2 className="text-white text-lg font-medium">Receive Funds</h2>
          <button
            onClick={handleClose}
            className="absolute right-6 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        <div
          className="overflow-y-auto p-6 space-y-6"
          style={{ maxHeight: "calc(90vh - 120px)" }}
        >
          {/* QR Code */}
          <div className="flex flex-col items-center">
            <div className="bg-white rounded-2xl p-4 mb-4">
              {qrCodeUrl ? (
                <img
                  src={qrCodeUrl}
                  alt="Wallet QR Code"
                  className="w-64 h-64"
                />
              ) : (
                <div className="w-64 h-64 bg-gray-200 rounded-xl flex items-center justify-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-gray-400"></div>
                </div>
              )}
            </div>

            <p className="text-gray-400 text-sm text-center max-w-xs">
              Scan this QR code to receive SOL and SPL tokens
            </p>
          </div>

          {/* Wallet Address */}
          <div>
            <label className="block text-white font-normal text-sm mb-2">
              Wallet Address
            </label>
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
              <p className="text-white text-sm font-mono text-center">
                {truncatedAddress}
              </p>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-4">
            <button
              onClick={handleCopy}
              className={`flex-1 py-3 rounded-2xl font-normal transition-all text-sm flex items-center justify-center gap-2 ${
                copySuccess
                  ? "bg-green-500 text-white"
                  : "bg-white/10 text-white hover:bg-white/15"
              }`}
            >
              <Copy size={16} />
              {copySuccess ? "Copied!" : "Copy"}
            </button>
            <button
              onClick={handleShare}
              className="flex-1 py-3 bg-[#35C2E2] text-white rounded-2xl font-normal hover:bg-[#35C2E2]/90 transition-colors text-sm flex items-center justify-center gap-2"
            >
              <Share size={16} />
              Share
            </button>
          </div>

          {/* Security Notice */}
          <div className="bg-white/5 border border-white/10 rounded-2xl p-4 flex items-center gap-3">
            <div className="w-5 h-5 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
              <Check size={12} className="text-white" />
            </div>
            <p className="text-gray-400 text-xs">
              Only share this address with trusted sources
            </p>
          </div>

          {/* Bottom Padding */}
          <div className="h-2" />
        </div>
      </div>
    </div>
  );
}
