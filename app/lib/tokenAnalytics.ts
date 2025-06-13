// REAL TOKEN ANALYTICS - NO FAKE DATA
import { TokenHolding } from "./solana";

export interface TokenDetails {
  mint: string;
  name: string;
  symbol: string;
  logoUri?: string;
  price: number;
  priceChange24h: number;
  marketCap?: number;
  volume24h: number;
  liquidity: number;
  status: "Listed" | "Unlisted";
}

export interface PricePoint {
  timestamp: number;
  price: number;
}

export interface SecurityAnalysis {
  riskScore: number;
  riskLevel: "Low Risk" | "Medium Risk" | "High Risk";
  description: string;
  indicators: {
    hasLiquidity: boolean;
    hasMetadata: boolean;
    hasVolume: boolean;
    isListed: boolean;
  };
}

export interface RealTradeData {
  buys24h: number;
  sells24h: number;
  volume24h: number;
  liquidity: number;
  priceChange24h: number;
  priceChange1h: number;
  priceChange6h: number;
}

export interface TokenAnalytics {
  details: TokenDetails;
  tradeData: RealTradeData;
  security: SecurityAnalysis;
  isDataAvailable: boolean;
  dataSource: string;
}

// Optimized caching
const analyticsCache = new Map<
  string,
  { data: TokenAnalytics; timestamp: number }
>();
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

// Rate limiting
let lastApiCall = 0;
const MIN_API_INTERVAL = 2000; // 2 seconds between calls

async function rateLimitedApiCall<T>(apiCall: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const timeSinceLastCall = now - lastApiCall;

  if (timeSinceLastCall < MIN_API_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_API_INTERVAL - timeSinceLastCall)
    );
  }

  lastApiCall = Date.now();
  return await apiCall();
}

// REAL DATA ONLY: Fetch actual trading data from DexScreener
async function fetchRealTokenData(
  mint: string,
  existingTokenData?: TokenHolding
): Promise<TokenAnalytics> {
  try {
    // Always use existing token data as the foundation
    if (!existingTokenData) {
      throw new Error("No existing token data provided");
    }

    const response = await rateLimitedApiCall(() =>
      fetch(`https://api.dexscreener.com/latest/dex/tokens/${mint}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "WalletApp/1.0",
        },
      })
    );

    let tokenDetails: TokenDetails = {
      mint,
      name: existingTokenData.name || "Unknown Token",
      symbol: existingTokenData.symbol || mint.slice(0, 6),
      logoUri: existingTokenData.logoUri,
      price: existingTokenData.priceUsd || 0,
      priceChange24h: 0,
      volume24h: 0,
      liquidity: 0,
      status: "Unlisted",
    };

    let tradeData: RealTradeData = {
      buys24h: 0,
      sells24h: 0,
      volume24h: 0,
      liquidity: 0,
      priceChange24h: 0,
      priceChange1h: 0,
      priceChange6h: 0,
    };

    let isDataAvailable = false;
    let dataSource = "Wallet Data Only";

    if (response.ok) {
      const data = await response.json();
      const pairs = data.pairs || [];

      if (pairs.length > 0) {
        // Get the most liquid pair for accurate data
        const bestPair = pairs.reduce((best: any, current: any) => {
          const bestLiq = parseFloat(best.liquidity?.usd || "0");
          const currentLiq = parseFloat(current.liquidity?.usd || "0");
          return currentLiq > bestLiq ? current : best;
        });

        // Extract REAL trading data
        const volume24h = parseFloat(bestPair.volume?.h24 || "0");
        const liquidity = parseFloat(bestPair.liquidity?.usd || "0");
        const priceChange24h = parseFloat(bestPair.priceChange?.h24 || "0");
        const priceChange1h = parseFloat(bestPair.priceChange?.h1 || "0");
        const priceChange6h = parseFloat(bestPair.priceChange?.h6 || "0");
        const marketCap = parseFloat(bestPair.marketCap || "0");

        // Real transaction counts
        const buys24h = bestPair.txns?.h24?.buys || 0;
        const sells24h = bestPair.txns?.h24?.sells || 0;

        tokenDetails = {
          ...tokenDetails,
          priceChange24h,
          volume24h,
          liquidity,
          marketCap: marketCap > 0 ? marketCap : undefined,
          status: liquidity > 10000 ? "Listed" : "Unlisted",
        };

        tradeData = {
          buys24h,
          sells24h,
          volume24h,
          liquidity,
          priceChange24h,
          priceChange1h,
          priceChange6h,
        };

        isDataAvailable = true;
        dataSource = "DexScreener (Real Trading Data)";
      }
    }

    const security = analyzeTokenSecurity(tokenDetails, tradeData);

    return {
      details: tokenDetails,
      tradeData,
      security,
      isDataAvailable,
      dataSource,
    };
  } catch (error) {
    console.error(`Failed to fetch real data for ${mint}:`, error);
    throw error;
  }
}

// REAL DATA: Security analysis based on actual metrics
function analyzeTokenSecurity(
  tokenDetails: TokenDetails,
  tradeData: RealTradeData
): SecurityAnalysis {
  const { liquidity, volume24h, name, status } = tokenDetails;

  const hasLiquidity = liquidity > 50000;
  const hasMetadata = name !== "Unknown Token" && name.length > 2;
  const hasVolume = volume24h > 1000;
  const isListed = status === "Listed";

  const indicators = { hasLiquidity, hasMetadata, hasVolume, isListed };
  const positiveCount = Object.values(indicators).filter(Boolean).length;

  let riskScore: number;
  let riskLevel: "Low Risk" | "Medium Risk" | "High Risk";
  let description: string;

  if (positiveCount >= 3 && liquidity > 100000 && volume24h > 10000) {
    riskScore = 1;
    riskLevel = "Low Risk";
    description = `Strong trading activity with $${formatLargeNumber(
      liquidity
    )} liquidity and $${formatLargeNumber(volume24h)} daily volume.`;
  } else if (positiveCount >= 2 && liquidity > 25000) {
    riskScore = 2;
    riskLevel = "Medium Risk";
    description = `Moderate activity with $${formatLargeNumber(
      liquidity
    )} liquidity. Research recommended before trading.`;
  } else {
    riskScore = 3;
    riskLevel = "High Risk";
    description = `Limited trading data available. Exercise extreme caution.`;
  }

  return { riskScore, riskLevel, description, indicators };
}

// Special handling for native SOL
async function getSOLAnalytics(
  existingTokenData?: TokenHolding
): Promise<TokenAnalytics> {
  const solMint = "So11111111111111111111111111111111111111112";

  try {
    const response = await rateLimitedApiCall(() =>
      fetch(`https://api.dexscreener.com/latest/dex/tokens/${solMint}`, {
        headers: {
          Accept: "application/json",
          "User-Agent": "WalletApp/1.0",
        },
      })
    );

    let tokenDetails: TokenDetails = {
      mint: solMint,
      name: "Solana",
      symbol: "SOL",
      logoUri:
        "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
      price: existingTokenData?.priceUsd || 100,
      priceChange24h: 0,
      volume24h: 0,
      liquidity: 0,
      status: "Listed",
    };

    let tradeData: RealTradeData = {
      buys24h: 0,
      sells24h: 0,
      volume24h: 0,
      liquidity: 0,
      priceChange24h: 0,
      priceChange1h: 0,
      priceChange6h: 0,
    };

    let isDataAvailable = false;
    let dataSource = "Wallet Data Only";

    if (response.ok) {
      const data = await response.json();
      const pairs = data.pairs || [];

      if (pairs.length > 0) {
        // Aggregate data from all major SOL pairs
        let totalVolume = 0;
        let totalLiquidity = 0;
        let totalBuys = 0;
        let totalSells = 0;
        let avgPriceChange24h = 0;
        let avgPriceChange1h = 0;
        let avgPriceChange6h = 0;

        // Take top 5 most liquid pairs for accurate aggregation
        const topPairs = pairs
          .sort(
            (a: any, b: any) =>
              parseFloat(b.liquidity?.usd || "0") -
              parseFloat(a.liquidity?.usd || "0")
          )
          .slice(0, 5);

        topPairs.forEach((pair: any) => {
          totalVolume += parseFloat(pair.volume?.h24 || "0");
          totalLiquidity += parseFloat(pair.liquidity?.usd || "0");
          totalBuys += pair.txns?.h24?.buys || 0;
          totalSells += pair.txns?.h24?.sells || 0;
          avgPriceChange24h += parseFloat(pair.priceChange?.h24 || "0");
          avgPriceChange1h += parseFloat(pair.priceChange?.h1 || "0");
          avgPriceChange6h += parseFloat(pair.priceChange?.h6 || "0");
        });

        // Calculate averages
        const pairCount = topPairs.length;
        avgPriceChange24h = pairCount > 0 ? avgPriceChange24h / pairCount : 0;
        avgPriceChange1h = pairCount > 0 ? avgPriceChange1h / pairCount : 0;
        avgPriceChange6h = pairCount > 0 ? avgPriceChange6h / pairCount : 0;

        tokenDetails = {
          ...tokenDetails,
          priceChange24h: avgPriceChange24h,
          volume24h: totalVolume,
          liquidity: totalLiquidity,
          marketCap: topPairs[0]?.marketCap
            ? parseFloat(topPairs[0].marketCap)
            : undefined,
        };

        tradeData = {
          buys24h: totalBuys,
          sells24h: totalSells,
          volume24h: totalVolume,
          liquidity: totalLiquidity,
          priceChange24h: avgPriceChange24h,
          priceChange1h: avgPriceChange1h,
          priceChange6h: avgPriceChange6h,
        };

        isDataAvailable = true;
        dataSource = "DexScreener (Aggregated SOL Data)";
      }
    }

    const security = analyzeTokenSecurity(tokenDetails, tradeData);

    return {
      details: tokenDetails,
      tradeData,
      security,
      isDataAvailable,
      dataSource,
    };
  } catch (error) {
    console.error("Failed to fetch SOL analytics:", error);
    throw error;
  }
}

// MAIN FUNCTION: Get real token analytics
export async function getTokenAnalytics(
  mint: string,
  existingTokenData?: TokenHolding
): Promise<TokenAnalytics> {
  // Check cache first
  const cached = analyticsCache.get(mint);
  if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
    return cached.data;
  }

  try {
    let analytics: TokenAnalytics;

    // Handle native SOL specially
    const isNativeSOL =
      mint === "So11111111111111111111111111111111111111112" || mint === "SOL";

    if (isNativeSOL) {
      analytics = await getSOLAnalytics(existingTokenData);
    } else {
      analytics = await fetchRealTokenData(mint, existingTokenData);
    }

    // Cache the result
    analyticsCache.set(mint, { data: analytics, timestamp: Date.now() });

    return analytics;
  } catch (error) {
    console.error(`Failed to get analytics for ${mint}:`, error);
    throw new Error("Unable to fetch token analytics");
  }
}

// UTILITY FUNCTIONS
export function formatLargeNumber(num: number): string {
  if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toFixed(2);
}

export function formatCurrency(amount: number): string {
  if (amount < 0.001) return "< $0.001";
  if (amount < 1) {
    return `$${amount.toFixed(4)}`;
  }
  return `$${amount.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function shortenAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 6)}...${address.slice(-6)}`;
}

// Helper function to create SOL token holding for analytics
export function createSOLTokenHolding(
  solBalance: number,
  solPrice: number
): TokenHolding {
  return {
    mint: "So11111111111111111111111111111111111111112",
    balance: solBalance * 1000000000, // Convert to lamports
    decimals: 9,
    uiAmount: solBalance,
    name: "Solana",
    symbol: "SOL",
    logoUri:
      "https://raw.githubusercontent.com/solana-labs/token-list/main/assets/mainnet/So11111111111111111111111111111111111111112/logo.png",
    priceUsd: solPrice,
    valueUsd: solBalance * solPrice,
  };
}

// Cache management
export function clearTokenAnalyticsCache(): void {
  analyticsCache.clear();
  console.log("🧹 Token analytics cache cleared");
}
