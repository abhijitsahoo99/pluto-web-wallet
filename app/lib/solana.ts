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

// Initialize Solana connection
export const connection = new Connection(SOLANA_RPC_URL, "confirmed");

// Cache for token metadata to avoid repeated API calls
const tokenMetadataCache = new Map<
  string,
  { name?: string; symbol?: string; logoUri?: string }
>();
let tokenListCache: any[] | null = null;

// Get SOL balance for a wallet
export async function getSolBalance(walletAddress: string): Promise<number> {
  try {
    const publicKey = new PublicKey(walletAddress);
    const balance = await connection.getBalance(publicKey);
    return balance / LAMPORTS_PER_SOL;
  } catch (error) {
    console.error("Error fetching SOL balance:", error);
    return 0;
  }
}

// Get all SPL token holdings for a wallet
export async function getTokenHoldings(
  walletAddress: string
): Promise<TokenHolding[]> {
  try {
    const publicKey = new PublicKey(walletAddress);
    const tokenAccounts = await connection.getParsedTokenAccountsByOwner(
      publicKey,
      { programId: TOKEN_PROGRAM_ID }
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

// Batch fetch token metadata from Jupiter token list
export async function batchGetTokenMetadata(
  mintAddresses: string[]
): Promise<
  Record<string, { name?: string; symbol?: string; logoUri?: string }>
> {
  try {
    // Return cached results if available
    const cachedResults: Record<
      string,
      { name?: string; symbol?: string; logoUri?: string }
    > = {};
    const uncachedMints: string[] = [];

    for (const mint of mintAddresses) {
      if (tokenMetadataCache.has(mint)) {
        cachedResults[mint] = tokenMetadataCache.get(mint)!;
      } else {
        uncachedMints.push(mint);
      }
    }

    if (uncachedMints.length === 0) {
      return cachedResults;
    }

    // Fetch token list if not cached with retry logic
    if (!tokenListCache) {
      tokenListCache = await fetchTokenListWithRetry();
    }

    // Process uncached mints with fallback handling
    const results = { ...cachedResults };

    for (const mint of uncachedMints) {
      const token = tokenListCache?.find((t: any) => t.address === mint);
      const metadata = token
        ? {
            name: token.name,
            symbol: token.symbol,
            logoUri: token.logoURI,
          }
        : createFallbackMetadata(mint);

      tokenMetadataCache.set(mint, metadata);
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
      if (tokenMetadataCache.has(mint)) {
        fallbackResults[mint] = tokenMetadataCache.get(mint)!;
      } else {
        fallbackResults[mint] = createFallbackMetadata(mint);
      }
    }

    return fallbackResults;
  }
}

// Helper function to fetch token list with retry logic
async function fetchTokenListWithRetry(maxRetries = 3): Promise<any[] | null> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch("https://token.jup.ag/strict", {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const tokenList = await response.json();
      console.log(`Successfully fetched token list on attempt ${attempt}`);
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

      // Wait before retry (exponential backoff)
      await new Promise((resolve) => setTimeout(resolve, 1000 * attempt));
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

// Get token prices from Jupiter API
export async function getTokenPrices(
  mintAddresses: string[]
): Promise<Record<string, number>> {
  try {
    if (mintAddresses.length === 0) return {};

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(
      `https://api.jup.ag/price/v2?ids=${mintAddresses.join(",")}`,
      {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();

    const prices: Record<string, number> = {};
    Object.entries(data.data || {}).forEach(
      ([mint, priceData]: [string, any]) => {
        prices[mint] = priceData.price;
      }
    );

    return prices;
  } catch (error) {
    console.error("Error fetching token prices:", error);
    return {};
  }
}

// Get SOL price in USD
export async function getSolPrice(): Promise<number> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    const response = await fetch(
      "https://api.jup.ag/price/v2?ids=So11111111111111111111111111111111111111112",
      {
        headers: { Accept: "application/json" },
        signal: controller.signal,
      }
    );

    clearTimeout(timeoutId);

    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.json();
    return (
      data.data?.["So11111111111111111111111111111111111111112"]?.price || 0
    );
  } catch (error) {
    console.error("Error fetching SOL price:", error);
    return 0;
  }
}

// Get complete wallet balance with USD values - OPTIMIZED VERSION
export async function getWalletBalance(
  walletAddress: string
): Promise<WalletBalance> {
  try {
    // Step 1: Fetch SOL balance and token holdings concurrently
    const [solBalance, tokenHoldings, solPrice] = await Promise.all([
      getSolBalance(walletAddress),
      getTokenHoldings(walletAddress),
      getSolPrice(),
    ]);

    // Step 2: Batch fetch metadata and prices for all tokens concurrently
    const tokenMints = tokenHoldings.map((h) => h.mint);
    const [tokenMetadata, prices] = await Promise.all([
      batchGetTokenMetadata(tokenMints),
      getTokenPrices(tokenMints),
    ]);

    // Step 3: Enrich token holdings with metadata and prices
    const enrichedTokens: TokenHolding[] = tokenHoldings.map((holding) => {
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
    throw error;
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
