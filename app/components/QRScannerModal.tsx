"use client";

import { useState, useEffect } from "react";
import { X, Camera } from "lucide-react";
import { Scanner } from "@yudiel/react-qr-scanner";
import { PublicKey } from "@solana/web3.js";

interface QRScannerModalProps {
  isOpen: boolean;
  onClose: () => void;
  onScan: (address: string) => void;
}

export default function QRScannerModal({
  isOpen,
  onClose,
  onScan,
}: QRScannerModalProps) {
  const [isAnimating, setIsAnimating] = useState(false);
  const [error, setError] = useState<string>("");
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);

  useEffect(() => {
    if (isOpen) {
      setIsAnimating(true);
      document.body.style.overflow = "hidden";
      // Request camera permission
      requestCameraPermission();
    } else {
      document.body.style.overflow = "unset";
      setError("");
      setHasPermission(null);
    }

    return () => {
      document.body.style.overflow = "unset";
    };
  }, [isOpen]);

  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      setHasPermission(true);
      // Stop the stream immediately as QrScanner will handle it
      stream.getTracks().forEach((track) => track.stop());
    } catch (err) {
      setHasPermission(false);
      setError(
        "Camera access denied. Please allow camera access to scan QR codes."
      );
    }
  };

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

  const handleScan = (detectedCodes: any) => {
    if (detectedCodes && detectedCodes.length > 0) {
      const scannedText = detectedCodes[0].rawValue;
      if (scannedText) {
        // Enhanced validation for Solana addresses (wallet addresses and SPL token addresses)
        // Solana addresses are base58 encoded and typically 32-44 characters
        const solanaAddressRegex = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;

        // Additional validation using Solana's PublicKey class for more accuracy
        try {
          // This will throw if the address is invalid - NO API CALLS MADE
          new PublicKey(scannedText);

          if (solanaAddressRegex.test(scannedText)) {
            onScan(scannedText);
            handleClose();
          } else {
            setError("Invalid address format");
          }
        } catch (err) {
          setError("Invalid Solana or SPL token address");
        }
      }
    }
  };

  const handleError = (err: any) => {
    console.error("QR Scanner error:", err);
    setError("Failed to access camera or scan QR code");
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
        className={`fixed bottom-0 left-0 right-0 bg-[#16303e] rounded-t-3xl transition-transform duration-300 ease-out border border-white/10 ${
          isAnimating && isOpen ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          maxHeight: "90vh",
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-center p-4 border-b border-white/10 relative">
          <h2 className="text-white text-lg font-medium">Scan QR Code</h2>
          <button
            onClick={handleClose}
            className="absolute right-2 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-white transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Scanner Area */}
          <div
            className="relative bg-black rounded-2xl overflow-hidden mb-4"
            style={{ aspectRatio: "1" }}
          >
            {hasPermission === null && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Camera size={48} className="text-gray-400 mx-auto mb-2" />
                  <p className="text-gray-400">Requesting camera access...</p>
                </div>
              </div>
            )}

            {hasPermission === false && (
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <Camera size={48} className="text-red-400 mx-auto mb-2" />
                  <p className="text-red-400 text-sm">Camera access denied</p>
                  <p className="text-gray-400 text-xs mt-1">
                    Please allow camera access in your browser settings
                  </p>
                </div>
              </div>
            )}

            {hasPermission === true && (
              <Scanner
                onScan={handleScan}
                onError={handleError}
                styles={{
                  container: { width: "100%", height: "100%" },
                  video: { width: "100%", height: "100%", objectFit: "cover" },
                }}
                constraints={{
                  facingMode: "environment",
                }}
              />
            )}

            {/* Scanning overlay */}
            {hasPermission === true && (
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-4 border-2 border-[#35C2E2] rounded-2xl">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-4 border-l-4 border-[#35C2E2] rounded-tl-lg"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-4 border-r-4 border-[#35C2E2] rounded-tr-lg"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-4 border-l-4 border-[#35C2E2] rounded-bl-lg"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-4 border-r-4 border-[#35C2E2] rounded-br-lg"></div>
                </div>
              </div>
            )}
          </div>

          {/* Instructions */}
          <div className="text-center mb-4">
            <p className="text-white text-sm mb-2">
              Position the QR code within the frame
            </p>
            <p className="text-gray-400 text-xs">
              Scan Solana wallet addresses or SPL token addresses to send funds
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
              <p className="text-red-400 text-sm text-center">{error}</p>
            </div>
          )}

          {/* Retry Button for Permission Issues */}
          {hasPermission === false && (
            <button
              onClick={requestCameraPermission}
              className="w-full bg-[#35C2E2] hover:bg-[#35C2E2]/80 text-white py-3 rounded-xl font-medium transition-colors"
            >
              Try Again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
