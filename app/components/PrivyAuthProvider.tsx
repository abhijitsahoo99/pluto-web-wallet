"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { ReactNode } from "react";

interface PrivyAuthProviderProps {
  children: ReactNode;
}

export default function PrivyAuthProvider({
  children,
}: PrivyAuthProviderProps) {
  if (!process.env.NEXT_PUBLIC_PRIVY_APP_ID) {
    throw new Error(
      "NEXT_PUBLIC_PRIVY_APP_ID is not set in environment variables"
    );
  }

  return (
    <PrivyProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID}
      config={{
        loginMethods: ["google", "twitter"],
        appearance: {
          theme: "light",
          accentColor: "#3B82F6",
        },
        embeddedWallets: {
          createOnLogin: "users-without-wallets",
          solana: {
            createOnLogin: "users-without-wallets",
          },
        },
      }}
    >
      {children}
    </PrivyProvider>
  );
}
