import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import PrivyAuthProvider from "./components/PrivyAuthProvider";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Pluto Wallet",
  description: "Solana wallet, built for everyone",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={inter.className}>
      <body className="min-h-screen overflow-x-hidden">
        <PrivyAuthProvider>{children}</PrivyAuthProvider>
      </body>
    </html>
  );
}
