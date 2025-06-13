import { Connection, PublicKey, LAMPORTS_PER_SOL } from "@solana/web3.js";
import { TOKEN_PROGRAM_ID } from "@solana/spl-token";

const HELIUS_API_KEY = process.env.NEXT_PUBLIC_HELIUS_API_KEY;
const SOLANA_RPC_URL =
  process.env.NEXT_PUBLIC_SOLANA_RPC_URL ||
  `https://mainnet.helius-rpc.com/?api-key=${HELIUS_API_KEY}`;

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

// Initialize Solana connection with optimized settings
export const connection = new Connection(SOLANA_RPC_URL, {
  commitment: "confirmed",
  confirmTransactionInitialTimeout: 30000,
});

// Enhanced caching system
const tokenMetadataCache = new Map<
  string,
  { name?: string; symbol?: string; logoUri?: string; timestamp: number }
>();
let tokenListCache: { data: any[] | null; timestamp: number } = {
  data: null,
  timestamp: 0,
};

// Price caching with longer duration for free tier optimization
const priceCache = new Map<string, { price: number; timestamp: number }>();
const multiPriceCache = new Map<
  string,
  { prices: Record<string, number>; timestamp: number }
>();
const PRICE_CACHE_DURATION = 5 * 60 * 1000; // 5 minutes for better free tier usage
const METADATA_CACHE_DURATION = 30 * 60 * 1000; // 30 minutes for metadata

// Rate limiting for RPC calls - MUCH MORE CONSERVATIVE
let lastRpcCall = 0;
const RPC_RATE_LIMIT_MS = 500; // 500ms between calls to prevent 429 errors

// Rate limiting helper with exponential backoff for 429 errors
async function rateLimitedRpcCall<T>(fn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const timeSinceLastCall = now - lastRpcCall;

  if (timeSinceLastCall < RPC_RATE_LIMIT_MS) {
    await new Promise((resolve) =>
      setTimeout(resolve, RPC_RATE_LIMIT_MS - timeSinceLastCall)
    );
  }

  lastRpcCall = Date.now();

  // Retry logic for 429 errors with longer delays
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      return await fn();
    } catch (error: any) {
      if (error?.message?.includes("429") || error?.status === 429) {
        retries++;
        const delay = Math.min(2000 * Math.pow(2, retries), 10000); // Longer exponential backoff, max 10s
        console.warn(
          `Server responded with 429. Retrying after ${delay}ms delay...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }

  throw new Error("Max retries exceeded for RPC call");
}

// Get SOL balance for a wallet with rate limiting
export async function getSolBalance(walletAddress: string): Promise<number> {
  try {
    const publicKey = new PublicKey(walletAddress);
    const balance = await rateLimitedRpcCall(() =>
      connection.getBalance(publicKey)
    );
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error("Error fetching SOL balance:", error);
    return 0;
  }
}

// Get all SPL token holdings for a wallet with rate limiting
export async function getTokenHoldings(
  walletAddress: string
): Promise<TokenHolding[]> {
  try {
    const publicKey = new PublicKey(walletAddress);
    const tokenAccounts = await rateLimitedRpcCall(() =>
      connection.getParsedTokenAccountsByOwner(publicKey, {
        programId: TOKEN_PROGRAM_ID,
      })
    );

    const holdings: TokenHolding[] = [];
    for (const { account } of tokenAccounts.value) {
      try {
        if (account.data?.parsed?.info) {
          const parsedInfo = account.data.parsed.info;
          const balance = parseInt(parsedInfo.tokenAmount.amount);
          const decimals = parsedInfo.tokenAmount.decimals;
          const uiAmount = parsedInfo.tokenAmount.uiAmount;

          if (uiAmount && uiAmount > 0) {
            holdings.push({
              mint: parsedInfo.mint,
              balance,
              decimals,
              uiAmount,
            });
          }
        }
      } catch (error) {
        console.error("Error processing token account:", error);
      }
    }
    return holdings;
  } catch (error) {
    console.error("Error fetching token holdings:", error);
    return [];
  }
}

// Batch fetch token metadata from Jupiter token list with enhanced caching
export async function batchGetTokenMetadata(
  mintAddresses: string[]
): Promise<
  Record<string, { name?: string; symbol?: string; logoUri?: string }>
> {
  try {
    // Return cached results if available and not expired
    const cachedResults: Record<
      string,
      { name?: string; symbol?: string; logoUri?: string }
    > = {};
    const uncachedMints: string[] = [];

    for (const mint of mintAddresses) {
      const cached = tokenMetadataCache.get(mint);
      if (cached && Date.now() - cached.timestamp < METADATA_CACHE_DURATION) {
        const { timestamp, ...metadata } = cached;
        cachedResults[mint] = metadata;
      } else {
        uncachedMints.push(mint);
      }
    }

    if (uncachedMints.length === 0) {
      return cachedResults;
    }

    // Fetch token list if not cached or expired
    const now = Date.now();
    if (
      !tokenListCache.data ||
      now - tokenListCache.timestamp > METADATA_CACHE_DURATION
    ) {
      tokenListCache.data = await fetchTokenListWithRetry();
      tokenListCache.timestamp = now;
    }

    // Process uncached mints with fallback handling
    const results = { ...cachedResults };

    for (const mint of uncachedMints) {
      const token = tokenListCache.data?.find((t: any) => t.address === mint);
      const metadata = token
        ? {
            name: token.name,
            symbol: token.symbol,
            logoUri: token.logoURI,
          }
        : createFallbackMetadata(mint);

      tokenMetadataCache.set(mint, { ...metadata, timestamp: now });
      results[mint] = metadata;
    }

    return results;
  } catch (error) {
    console.error("Error fetching token metadata:", error);

    // Return cached results + fallbacks for uncached mints
    const fallbackResults: Record<
      string,
      { name?: string; symbol?: string; logoUri?: string }
    > = {};

    for (const mint of mintAddresses) {
      const cached = tokenMetadataCache.get(mint);
      if (cached) {
        const { timestamp, ...metadata } = cached;
        fallbackResults[mint] = metadata;
      } else {
        fallbackResults[mint] = createFallbackMetadata(mint);
      }
    }

    return fallbackResults;
  }
}

// Helper function to fetch token list with retry logic and better error handling
async function fetchTokenListWithRetry(maxRetries = 2): Promise<any[] | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 8000); // 8s timeout

      const response = await fetch("https://token.jup.ag/strict", {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const tokenList = await response.json();
      console.log(`✅ Token list fetched successfully on attempt ${attempt}`);
      return tokenList;
    } catch (error) {
      console.warn(
        `Token list fetch attempt ${attempt}/${maxRetries} failed:`,
        error
      );

      if (attempt === maxRetries) {
        console.error("All token list fetch attempts failed, using fallbacks");
        return null;
      }

      // Wait before retry with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }

  return null;
}

// Helper function to create fallback metadata for unknown tokens
function createFallbackMetadata(mint: string): {
  name?: string;
  symbol?: string;
  logoUri?: string;
} {
  return {
    name: `Token ${mint.slice(0, 8)}...`,
    symbol: mint.slice(0, 4).toUpperCase(),
    logoUri: undefined,
  };
}

// Get token metadata from Jupiter token list (legacy function for backward compatibility)
export async function getTokenMetadata(
  mintAddress: string
): Promise<{ name?: string; symbol?: string; logoUri?: string }> {
  const results = await batchGetTokenMetadata([mintAddress]);
  return results[mintAddress] || {};
}

function isValidMint(mint: string): boolean {
  // Validate mint address format
  return (
    (mint.length === 44 && /^[1-9A-HJ-NP-Za-km-z]+$/.test(mint)) ||
    mint === "So11111111111111111111111111111111111111112"
  );
}

// Optimized Jupiter price fetcher with better error handling
async function fetchJupiterPrice(mint: string): Promise<number> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const url = `https://api.jup.ag/price/v2?ids=${mint}`;
    const res = await fetch(url, {
      headers: { Accept: "application/json" },
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!res.ok) return 0;
    const data = await res.json();
    return data.data?.[mint]?.price || 0;
  } catch (error) {
    console.warn(`Jupiter price fetch failed for ${mint}:`, error);
    return 0;
  }
}

// Optimized token prices with better fallback strategy
export async function getTokenPrices(
  mintAddresses: string[]
): Promise<Record<string, number>> {
  try {
    if (mintAddresses.length === 0) return {};

    // Filter and validate mints
    const validMints = mintAddresses.filter(isValidMint);
    if (validMints.length === 0) return {};

    // Check cache first
    const cacheKey = validMints.sort().join(",");
    const cached = multiPriceCache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < PRICE_CACHE_DURATION) {
      return cached.prices;
    }

    let prices: Record<string, number> = {};

    // Use Jupiter for all tokens with controlled concurrency
    console.log("🔄 Fetching prices from Jupiter for optimal free tier usage");

    // Use Jupiter for all tokens with controlled concurrency
    const pricePromises = validMints.map(async (mint) => {
      const price = await fetchJupiterPrice(mint);
      return { mint, price };
    });

    // Process in batches to avoid overwhelming the API
    const batchSize = 5;
    for (let i = 0; i < pricePromises.length; i += batchSize) {
      const batch = pricePromises.slice(i, i + batchSize);
      const results = await Promise.all(batch);

      results.forEach(({ mint, price }) => {
        prices[mint] = price;
      });

      // Small delay between batches
      if (i + batchSize < pricePromises.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    multiPriceCache.set(cacheKey, { prices, timestamp: Date.now() });
    return prices;
  } catch (error) {
    console.error("Error fetching token prices:", error);
    return {};
  }
}

// Optimized SOL price fetching
export async function getSolPrice(): Promise<number> {
  try {
    const SOL_MINT = "So11111111111111111111111111111111111111112";
    const cached = priceCache.get(SOL_MINT);
    if (cached && Date.now() - cached.timestamp < PRICE_CACHE_DURATION) {
      return cached.price;
    }

    // Use Jupiter directly for better reliability and free tier usage
    const price = await fetchJupiterPrice(SOL_MINT);

    if (price > 0) {
      priceCache.set(SOL_MINT, { price, timestamp: Date.now() });
      return price;
    }

    // Fallback to a reasonable default if all APIs fail
    console.warn("All price APIs failed, using cached or default SOL price");
    return cached?.price || 100; // Reasonable fallback price
  } catch (error) {
    console.error("Error fetching SOL price:", error);
    return 100; // Fallback price
  }
}

// Get complete wallet balance with USD values - OPTIMIZED VERSION
export async function getWalletBalance(
  walletAddress: string
): Promise<WalletBalance> {
  try {
    // Step 1: Fetch SOL balance and token holdings with controlled concurrency
    const [solBalance, tokenHoldings] = await Promise.all([
      getSolBalance(walletAddress),
      getTokenHoldings(walletAddress),
    ]);

    // Step 2: Get SOL price first (most important)
    const solPrice = await getSolPrice();

    // Step 3: Process tokens only if we have any
    let enrichedTokens: TokenHolding[] = [];

    if (tokenHoldings.length > 0) {
      const tokenMints = tokenHoldings.map((h) => h.mint);

      // Batch fetch metadata and prices with controlled timing
      const [tokenMetadata, prices] = await Promise.all([
        batchGetTokenMetadata(tokenMints),
        getTokenPrices(tokenMints),
      ]);

      // Enrich token holdings with metadata and prices
      enrichedTokens = tokenHoldings.map((holding) => {
        const metadata = tokenMetadata[holding.mint] || {};
        const priceUsd = prices[holding.mint] || 0;
        const valueUsd = holding.uiAmount * priceUsd;

        return {
          ...holding,
          name: metadata.name,
          symbol: metadata.symbol,
          logoUri: metadata.logoUri,
          priceUsd,
          valueUsd,
        };
      });
    }

    const solValueUsd = solBalance * solPrice;
    const tokensTotalValue = enrichedTokens.reduce(
      (sum, token) => sum + (token.valueUsd || 0),
      0
    );

    return {
      solBalance,
      solValueUsd,
      tokens: enrichedTokens.sort(
        (a, b) => (b.valueUsd || 0) - (a.valueUsd || 0)
      ),
      totalValueUsd: solValueUsd + tokensTotalValue,
    };
  } catch (error) {
    console.error("Error fetching wallet balance:", error);

    // Return a safe fallback instead of throwing
    return {
      solBalance: 0,
      solValueUsd: 0,
      tokens: [],
      totalValueUsd: 0,
    };
  }
}

// Utility function to format prices safely
export function formatPrice(price: number | undefined | null): string {
  if (price === undefined || price === null || isNaN(price)) return "0.00";
  return price.toFixed(2);
}

// Utility function to format values safely
export function formatValue(value: number | undefined | null): string {
  if (value === undefined || value === null || isNaN(value)) return "$0.00";
  return `$${value.toFixed(2)}`;
}
