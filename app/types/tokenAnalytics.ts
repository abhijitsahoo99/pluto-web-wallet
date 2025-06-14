export interface TokenDetails {
  mint: string;
  name: string;
  symbol: string;
  logoUri?: string;
  price: number;
  priceChange24h: number;
  marketCap?: number;
  status: string;
}

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface TopHolder {
  address: string;
  balance: number;
  percentage: number;
}

export interface SecurityAnalysis {
  riskScore: number;
  riskLevel: "Low Risk" | "Medium Risk" | "High Risk";
  description: string;
  hasLiquidity: boolean;
  hasValidMetadata: boolean;
  isVerified: boolean;
}

export interface RealTradeData {
  volume24h: number;
  buys24h: number;
  sells24h: number;
  liquidity: number;
}

export interface TokenAnalytics {
  details: TokenDetails;
  priceHistory: PricePoint[];
  topHolders: TopHolder[];
  security: SecurityAnalysis;
  tradeData: RealTradeData;
  totalHolders: number;
  isDataAvailable: boolean;
}
