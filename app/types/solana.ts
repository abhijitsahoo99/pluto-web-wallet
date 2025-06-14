export interface TokenHolding {
  mint: string;
  balance: number;
  decimals: number;
  uiAmount: number;
  name?: string;
  symbol?: string;
  logoUri?: string;
  priceUsd?: number;
  valueUsd?: number;
}

export interface WalletBalance {
  solBalance: number;
  solValueUsd?: number;
  tokens: TokenHolding[];
  totalValueUsd: number;
}
