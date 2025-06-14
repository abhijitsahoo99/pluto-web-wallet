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
        // Skip invalid token accounts
      }
    }
    return holdings;
  } catch (error) {
    return [];
  }
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

// NEW: Fetch token metadata from DexScreener as fallback
async function fetchDexScreenerMetadata(mint: string): Promise<{
  name?: string;
  symbol?: string;
  logoUri?: string;
}> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(
      `https://api.dexscreener.com/latest/dex/tokens/${mint}`,
      {
        headers: {
          Accept: "application/json",
          "User-Agent": "WalletApp/1.0",
        },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) {
      return createFallbackMetadata(mint);
    }

    const data = await response.json();
    const pairs = data.pairs || [];

    if (pairs.length > 0) {
      // Find the pair that contains our mint address
      const validPair = pairs.find((pair: any) => {
        const baseToken = pair.baseToken;
        const quoteToken = pair.quoteToken;
        return baseToken?.address === mint || quoteToken?.address === mint;
      });

      if (validPair) {
        // Determine which token in the pair is ours
        const isBaseToken = validPair.baseToken?.address === mint;
        const ourToken = isBaseToken
          ? validPair.baseToken
          : validPair.quoteToken;

        if (ourToken?.name && ourToken?.symbol) {
          // Handle different logo field names that DexScreener might use
          const logoUri =
            ourToken.logoURI ||
            ourToken.logoUri ||
            ourToken.logo ||
            ourToken.image;

          // Additional logo sources from the pair info itself
          const pairLogoUri =
            validPair.info?.imageUrl || validPair.info?.logoUrl;

          // Try to get the best logo URL available
          let finalLogoUri = logoUri || pairLogoUri;

          // Validate and clean the logo URL
          if (finalLogoUri) {
            try {
              // Ensure it's a valid URL
              new URL(finalLogoUri);

              // Some DexScreener URLs might need cleaning
              if (finalLogoUri.includes("?")) {
                finalLogoUri = finalLogoUri.split("?")[0]; // Remove query parameters that might cause issues
              }
            } catch (error) {
              // Invalid URL, don't use it
              finalLogoUri = undefined;
            }
          }

          const metadata = {
            name: ourToken.name.trim(),
            symbol: ourToken.symbol.trim().toUpperCase(),
            logoUri: finalLogoUri || undefined,
          };

          return metadata;
        }
      }
    }

    return createFallbackMetadata(mint);
  } catch (error) {
    // Silent fallback for production
    return createFallbackMetadata(mint);
  }
}

// ENHANCED: Batch get token metadata with DexScreener fallback
export async function batchGetTokenMetadata(
  mintAddresses: string[]
): Promise<
  Record<string, { name?: string; symbol?: string; logoUri?: string }>
> {
  try {
    if (mintAddresses.length === 0) return {};

    const results: Record<
      string,
      { name?: string; symbol?: string; logoUri?: string }
    > = {};
    const now = Date.now();

    // Step 1: Check cache and collect uncached mints
    const uncachedMints: string[] = [];
    for (const mint of mintAddresses) {
      const cached = tokenMetadataCache.get(mint);
      if (cached && now - cached.timestamp < METADATA_CACHE_DURATION) {
        const { timestamp, ...metadata } = cached;
        results[mint] = metadata;
      } else {
        uncachedMints.push(mint);
      }
    }

    if (uncachedMints.length === 0) {
      return results;
    }

    // Step 2: Fetch from Jupiter token list
    const tokenList = await fetchTokenListWithRetry();
    const jupiterResults: Record<string, any> = {};
    const missingFromJupiter: string[] = [];

    if (tokenList) {
      // Create a map for faster lookups
      const tokenMap = new Map(
        tokenList.map((token: any) => [token.address, token])
      );

      for (const mint of uncachedMints) {
        const token = tokenMap.get(mint);
        if (token) {
          const metadata = {
            name: token.name,
            symbol: token.symbol,
            logoUri: token.logoURI,
          };
          jupiterResults[mint] = metadata;
          results[mint] = metadata;
          tokenMetadataCache.set(mint, { ...metadata, timestamp: now });
        } else {
          missingFromJupiter.push(mint);
        }
      }
    } else {
      // If Jupiter fails, all mints are missing
      missingFromJupiter.push(...uncachedMints);
    }

    // Step 3: For tokens missing from Jupiter, try DexScreener (with rate limiting)
    if (missingFromJupiter.length > 0) {
      // Filter out system tokens and very short addresses that are unlikely to be real tokens
      const validForDexScreener = missingFromJupiter.filter((mint) => {
        // Skip system tokens and invalid addresses
        if (mint.length < 32 || mint === "11111111111111111111111111111111") {
          return false;
        }
        return true;
      });

      if (validForDexScreener.length > 0) {
        // Process DexScreener requests with rate limiting (max 3 concurrent)
        const batchSize = 3;
        for (let i = 0; i < validForDexScreener.length; i += batchSize) {
          const batch = validForDexScreener.slice(i, i + batchSize);

          const batchPromises = batch.map(async (mint) => {
            const metadata = await fetchDexScreenerMetadata(mint);
            return { mint, metadata };
          });

          const batchResults = await Promise.all(batchPromises);

          batchResults.forEach(({ mint, metadata }) => {
            results[mint] = metadata;
            tokenMetadataCache.set(mint, { ...metadata, timestamp: now });
          });

          // Rate limiting: wait between batches
          if (i + batchSize < validForDexScreener.length) {
            await new Promise((resolve) => setTimeout(resolve, 1000)); // 1 second between batches
          }
        }
      }

      // For any remaining tokens (invalid ones), use fallback metadata
      const remainingTokens = missingFromJupiter.filter(
        (mint) => !validForDexScreener.includes(mint)
      );
      remainingTokens.forEach((mint) => {
        const fallbackMetadata = createFallbackMetadata(mint);
        results[mint] = fallbackMetadata;
        tokenMetadataCache.set(mint, { ...fallbackMetadata, timestamp: now });
      });
    }

    return results;
  } catch (error) {
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
      return tokenList;
    } catch (error) {
      if (attempt === maxRetries) {
        return null;
      }

      // Wait before retry with exponential backoff
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }

  return null;
}

// Get token metadata from Jupiter token list (legacy function for backward compatibility)
export async function getTokenMetadata(
  mintAddress: string
): Promise<{ name?: string; symbol?: string; logoUri?: string }> {
  const results = await batchGetTokenMetadata([mintAddress]);
  return results[mintAddress] || {};
}

function isValidMint(mint: string): boolean {
  // Validate mint address format - Solana addresses can be 32-44 characters
  return (
    (mint.length >= 32 &&
      mint.length <= 44 &&
      /^[1-9A-HJ-NP-Za-km-z]+$/.test(mint)) ||
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
    return cached?.price || 100; // Reasonable fallback price
  } catch (error) {
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
