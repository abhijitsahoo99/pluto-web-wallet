import {
  Connection,
  PublicKey,
  ParsedTransactionWithMeta,
  ConfirmedSignatureInfo,
} from "@solana/web3.js";
import { connection, batchGetTokenMetadata } from "./solana";

export interface Transaction {
  signature: string;
  type: "send" | "receive" | "swap";
  amount: number;
  token: string;
  tokenSymbol: string;
  counterparty?: string;
  timestamp: number;
  status: "success" | "failed";
  fee?: number;
  slot?: number;
  swapDetails?: {
    fromToken: string;
    fromSymbol: string;
    fromAmount: number;
    toToken: string;
    toSymbol: string;
    toAmount: number;
  };
}

// Transaction cache to avoid refetching
const transactionCache = new Map<string, Transaction[]>();
const CACHE_DURATION = 30000; // 30 seconds
const cacheTimestamps = new Map<string, number>();
const MAX_CACHE_ENTRIES = 10; // Prevent memory leaks

// Rate limiting - increased to prevent 429 errors
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 800; // 800ms between requests to prevent 429 errors

// Token metadata cache
const tokenMetadataCache = new Map<
  string,
  { symbol: string; name: string; timestamp: number }
>();
const METADATA_CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
const MAX_METADATA_CACHE_ENTRIES = 100; // Prevent memory leaks

// Cache cleanup utility
const cleanupCache = () => {
  const now = Date.now();

  // Cleanup transaction cache
  if (transactionCache.size > MAX_CACHE_ENTRIES) {
    const entries = Array.from(cacheTimestamps.entries())
      .sort(([, a], [, b]) => a - b) // Sort by timestamp (oldest first)
      .slice(0, transactionCache.size - MAX_CACHE_ENTRIES);

    entries.forEach(([key]) => {
      transactionCache.delete(key);
      cacheTimestamps.delete(key);
    });
  }

  // Cleanup metadata cache
  if (tokenMetadataCache.size > MAX_METADATA_CACHE_ENTRIES) {
    const entries = Array.from(tokenMetadataCache.entries())
      .filter(([, data]) => now - data.timestamp > METADATA_CACHE_DURATION)
      .slice(0, tokenMetadataCache.size - MAX_METADATA_CACHE_ENTRIES);

    entries.forEach(([key]) => {
      tokenMetadataCache.delete(key);
    });
  }
};

async function getTokenInfo(
  mint: string
): Promise<{ symbol: string; name: string; decimals: number }> {
  // Handle SOL specially - it's the native token, not an SPL token
  if (mint === "So11111111111111111111111111111111111111112") {
    return { symbol: "SOL", name: "Solana", decimals: 9 };
  }

  // Check cache first
  const cached = tokenMetadataCache.get(mint);
  if (cached && Date.now() - cached.timestamp < METADATA_CACHE_DURATION) {
    return { ...cached, decimals: 9 };
  }

  // Fetch from blockchain
  try {
    console.log(`🔍 Fetching metadata for token: ${mint}`);
    const metadata = await batchGetTokenMetadata([mint]);
    const tokenData = metadata[mint];
    console.log(`📋 Metadata result for ${mint}:`, tokenData);

    if (tokenData?.symbol) {
      const result = {
        symbol: tokenData.symbol,
        name: tokenData.name || tokenData.symbol,
        timestamp: Date.now(),
      };
      tokenMetadataCache.set(mint, result);
      console.log(
        `✅ Using fetched metadata: ${result.symbol} (${result.name})`
      );
      return { ...result, decimals: 9 };
    }
  } catch (error) {
    console.warn(`❌ Failed to fetch metadata for ${mint}:`, error);
  }

  // Fallback
  console.log(`⚠️ Using fallback for token: ${mint}`);
  return {
    symbol: mint.slice(0, 6),
    name: "Unknown Token",
    decimals: 9,
  };
}

function formatTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diff = now - timestamp * 1000;

  const minutes = Math.floor(diff / (1000 * 60));
  const hours = Math.floor(diff / (1000 * 60 * 60));
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));

  if (minutes < 60) {
    return `${minutes}m ago`;
  } else if (hours < 24) {
    return `${hours}h ago`;
  } else {
    return `${days}d ago`;
  }
}

function shortenAddress(address: string): string {
  if (address.length <= 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}

// Rate limiting helper
async function rateLimitedRequest<T>(requestFn: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const timeSinceLastRequest = now - lastRequestTime;

  if (timeSinceLastRequest < MIN_REQUEST_INTERVAL) {
    await new Promise((resolve) =>
      setTimeout(resolve, MIN_REQUEST_INTERVAL - timeSinceLastRequest)
    );
  }

  lastRequestTime = Date.now();

  // Retry logic for 429 errors
  let retries = 0;
  const maxRetries = 3;

  while (retries < maxRetries) {
    try {
      return await requestFn();
    } catch (error: any) {
      if (error?.message?.includes("429") || error?.status === 429) {
        retries++;
        const delay = Math.min(2000 * Math.pow(2, retries), 10000); // Exponential backoff, max 10s
        console.warn(
          `Server responded with 429. Retrying after ${delay}ms delay...`
        );
        await new Promise((resolve) => setTimeout(resolve, delay));
        continue;
      }
      throw error;
    }
  }

  throw new Error("Max retries exceeded for transaction request");
}

// Enhanced swap detection
async function detectSwapTransaction(
  tx: ParsedTransactionWithMeta,
  walletAddress: string
): Promise<Transaction | null> {
  if (!tx.meta?.preTokenBalances || !tx.meta?.postTokenBalances) {
    return null;
  }

  // Check for swap programs first
  const instructions = tx.transaction.message.instructions;
  const swapPrograms = [
    "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4", // Jupiter
    "675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8", // Raydium
    "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", // Orca
    "22Y43yTVxuUkoRKdm9thyRhQ3SdgQS7c7kB6UNCiaczD", // Serum DEX
    "srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX", // Serum DEX v3
  ];

  const hasSwapProgram = instructions.some((instruction) =>
    swapPrograms.includes(instruction.programId.toString())
  );

  if (!hasSwapProgram) {
    return null;
  }

  // Analyze token balance changes for the wallet
  const tokenChanges = new Map<
    string,
    { pre: number; post: number; change: number }
  >();

  // Process pre-balances
  tx.meta.preTokenBalances.forEach((balance) => {
    if (balance.owner === walletAddress) {
      tokenChanges.set(balance.mint, {
        pre: balance.uiTokenAmount.uiAmount || 0,
        post: 0,
        change: 0,
      });
    }
  });

  // Process post-balances
  tx.meta.postTokenBalances.forEach((balance) => {
    if (balance.owner === walletAddress) {
      const existing = tokenChanges.get(balance.mint) || {
        pre: 0,
        post: 0,
        change: 0,
      };
      existing.post = balance.uiTokenAmount.uiAmount || 0;
      existing.change = existing.post - existing.pre;
      tokenChanges.set(balance.mint, existing);
    }
  });

  // Also check SOL balance changes
  const accountKeys = tx.transaction.message.accountKeys;
  const walletIndex = accountKeys.findIndex(
    (key) => key.pubkey.toString() === walletAddress
  );

  if (walletIndex !== -1 && tx.meta.preBalances && tx.meta.postBalances) {
    const solChange =
      (tx.meta.postBalances[walletIndex] - tx.meta.preBalances[walletIndex]) /
      1e9;
    console.log(`💰 SOL balance change: ${solChange} (threshold: 0.00001)`);
    if (Math.abs(solChange) > 0.00001) {
      tokenChanges.set("So11111111111111111111111111111111111111112", {
        pre: tx.meta.preBalances[walletIndex] / 1e9,
        post: tx.meta.postBalances[walletIndex] / 1e9,
        change: solChange,
      });
      console.log(`✅ SOL change included in analysis: ${solChange}`);
    } else {
      console.log(`❌ SOL change too small, ignored: ${solChange}`);
    }
  }

  // Find tokens that decreased (sold) and increased (bought)
  let fromToken = "";
  let fromSymbol = "";
  let fromAmount = 0;
  let toToken = "";
  let toSymbol = "";
  let toAmount = 0;

  console.log(
    `🔍 Analyzing token changes for swap:`,
    Array.from(tokenChanges.entries())
  );

  for (const [mint, data] of Array.from(tokenChanges.entries())) {
    console.log(`Token ${mint}: change = ${data.change}`);
    if (data.change < -0.000001) {
      // Token decreased (sold)
      fromToken = mint;
      fromAmount = Math.abs(data.change);
      const tokenInfo = await getTokenInfo(mint);
      fromSymbol = tokenInfo.symbol;
      console.log(`📤 From token: ${fromAmount} ${fromSymbol} (${mint})`);
    } else if (data.change > 0.000001) {
      // Token increased (bought)
      toToken = mint;
      toAmount = data.change;
      const tokenInfo = await getTokenInfo(mint);
      toSymbol = tokenInfo.symbol;
      console.log(`📥 To token: ${toAmount} ${toSymbol} (${mint})`);
    }
  }

  // If we found both from and to tokens, it's a swap
  if (fromToken && toToken && fromAmount > 0 && toAmount > 0) {
    console.log(
      `✅ Swap detected: ${fromAmount.toFixed(
        4
      )} ${fromSymbol} → ${toAmount.toFixed(4)} ${toSymbol}`
    );
    return {
      signature: tx.transaction.signatures[0],
      type: "swap",
      amount: fromAmount,
      token: fromToken,
      tokenSymbol: fromSymbol,
      timestamp: tx.blockTime || 0,
      status: "success",
      fee: (tx.meta.fee || 0) / 1e9,
      slot: tx.slot,
      swapDetails: {
        fromToken,
        fromSymbol,
        fromAmount,
        toToken,
        toSymbol,
        toAmount,
      },
    };
  }

  // Fallback: If we have a swap program but couldn't detect tokens, still mark as swap
  if (hasSwapProgram && tokenChanges.size > 0) {
    console.log(
      `⚠️ Swap program detected but couldn't identify tokens clearly. Token changes:`,
      Array.from(tokenChanges.entries())
    );
    console.log(
      `fromToken: ${fromToken}, toToken: ${toToken}, fromAmount: ${fromAmount}, toAmount: ${toAmount}`
    );

    const firstChange = Array.from(tokenChanges.entries())[0];
    const [mint, data] = firstChange;
    const tokenInfo = await getTokenInfo(mint);

    return {
      signature: tx.transaction.signatures[0],
      type: "swap",
      amount: Math.abs(data.change),
      token: mint,
      tokenSymbol: tokenInfo.symbol,
      timestamp: tx.blockTime || 0,
      status: "success",
      fee: (tx.meta.fee || 0) / 1e9,
      slot: tx.slot,
      swapDetails: {
        fromToken: mint,
        fromSymbol: tokenInfo.symbol,
        fromAmount: Math.abs(data.change),
        toToken: "Unknown",
        toSymbol: "Unknown",
        toAmount: 0,
      },
    };
  }

  return null;
}

// Enhanced counterparty detection
function findCounterparty(
  tx: ParsedTransactionWithMeta,
  walletAddress: string,
  isReceive: boolean
): string {
  // Try to find counterparty from instructions first
  const instructions = tx.transaction.message.instructions;

  for (const instruction of instructions) {
    if ("parsed" in instruction && instruction.parsed) {
      const parsed = instruction.parsed;

      // Check for transfer instructions
      if (parsed.type === "transfer" && parsed.info) {
        const { source, destination, authority } = parsed.info;

        if (isReceive && source && source !== walletAddress) {
          return shortenAddress(source);
        } else if (!isReceive && destination && destination !== walletAddress) {
          return shortenAddress(destination);
        } else if (authority && authority !== walletAddress) {
          return shortenAddress(authority);
        }
      }

      // Check for transferChecked instructions (SPL tokens)
      if (parsed.type === "transferChecked" && parsed.info) {
        const { source, destination, authority } = parsed.info;

        if (isReceive && authority && authority !== walletAddress) {
          return shortenAddress(authority);
        } else if (!isReceive && destination && destination !== walletAddress) {
          return shortenAddress(destination);
        }
      }
    }
  }

  // Fallback: check balance changes in other accounts
  const accountKeys = tx.transaction.message.accountKeys;
  const preBalances = tx.meta?.preBalances || [];
  const postBalances = tx.meta?.postBalances || [];

  for (
    let i = 0;
    i < Math.min(accountKeys.length, preBalances.length, postBalances.length);
    i++
  ) {
    const accountAddress = accountKeys[i].pubkey.toString();
    if (accountAddress !== walletAddress) {
      const balanceChange = (postBalances[i] - preBalances[i]) / 1e9;

      // Look for significant opposite balance change
      if (Math.abs(balanceChange) > 0.001) {
        if (
          (isReceive && balanceChange < -0.001) ||
          (!isReceive && balanceChange > 0.001)
        ) {
          return shortenAddress(accountAddress);
        }
      }
    }
  }

  return "Unknown";
}

// Optimized transaction parsing - focus on most common patterns first
async function parseTransactionOptimized(
  tx: ParsedTransactionWithMeta,
  walletAddress: string
): Promise<Transaction | null> {
  if (!tx.meta || tx.meta.err) {
    return null;
  }

  const signature = tx.transaction.signatures[0];
  const timestamp = tx.blockTime || 0;
  const fee = (tx.meta.fee || 0) / 1e9;
  const slot = tx.slot;

  // First check if it's a swap
  const swapTx = await detectSwapTransaction(tx, walletAddress);
  if (swapTx) {
    swapTx.slot = slot;
    return swapTx;
  }

  // Quick SOL balance check first (most common)
  const preBalances = tx.meta.preBalances;
  const postBalances = tx.meta.postBalances;
  const accountKeys = tx.transaction.message.accountKeys;

  const walletIndex = accountKeys.findIndex(
    (key) => key.pubkey.toString() === walletAddress
  );

  if (
    walletIndex !== -1 &&
    walletIndex < preBalances.length &&
    walletIndex < postBalances.length
  ) {
    const preBalance = preBalances[walletIndex];
    const postBalance = postBalances[walletIndex];
    const balanceChange = (postBalance - preBalance) / 1e9;

    // Significant SOL movement (excluding dust)
    if (Math.abs(balanceChange) > 0.001) {
      const isReceive = balanceChange > 0;
      let amount = Math.abs(balanceChange);

      // For sends, adjust for fee
      if (!isReceive && amount > fee) {
        amount = amount - fee;
      }

      // Find counterparty with enhanced detection
      const counterparty = findCounterparty(tx, walletAddress, isReceive);

      return {
        signature,
        type: isReceive ? "receive" : "send",
        amount: Math.max(0, amount),
        token: "So11111111111111111111111111111111111111112",
        tokenSymbol: "SOL",
        counterparty,
        timestamp,
        status: "success",
        fee: isReceive ? undefined : fee,
        slot,
      } as Transaction;
    }
  }

  // Check for token transfers in pre/post token balances (more efficient than parsing instructions)
  if (tx.meta.preTokenBalances && tx.meta.postTokenBalances) {
    const walletTokenChanges = new Map<string, number>();

    // Process pre-balances
    tx.meta.preTokenBalances.forEach((balance) => {
      if (balance.owner === walletAddress) {
        walletTokenChanges.set(
          balance.mint,
          -(balance.uiTokenAmount.uiAmount || 0)
        );
      }
    });

    // Process post-balances
    tx.meta.postTokenBalances.forEach((balance) => {
      if (balance.owner === walletAddress) {
        const current = walletTokenChanges.get(balance.mint) || 0;
        walletTokenChanges.set(
          balance.mint,
          current + (balance.uiTokenAmount.uiAmount || 0)
        );
      }
    });

    // Find significant token changes
    for (const [mint, change] of Array.from(walletTokenChanges.entries())) {
      if (Math.abs(change) > 0.000001) {
        const tokenInfo = await getTokenInfo(mint);
        const isReceive = change > 0;

        // Enhanced counterparty detection for token transfers
        const counterparty = findCounterparty(tx, walletAddress, isReceive);

        return {
          signature,
          type: isReceive ? "receive" : "send",
          amount: Math.abs(change),
          token: mint,
          tokenSymbol: tokenInfo.symbol,
          counterparty,
          timestamp,
          status: "success",
          fee: isReceive ? undefined : fee,
          slot,
        };
      }
    }
  }

  return null;
}

// Batch transaction fetching with pagination support
export async function getWalletTransactions(
  walletAddress: string,
  options: {
    limit?: number;
    before?: string; // Signature to fetch transactions before (for pagination)
  } = {}
): Promise<{
  transactions: Transaction[];
  hasMore: boolean;
  nextCursor?: string;
}> {
  try {
    const { limit = 15, before } = options; // Default 15 transactions per page

    // Check cache first (only for first page)
    if (!before) {
      const cacheKey = walletAddress;
      const cachedTime = cacheTimestamps.get(cacheKey);
      const now = Date.now();

      if (cachedTime && now - cachedTime < CACHE_DURATION) {
        const cached = transactionCache.get(cacheKey);
        if (cached && cached.length > 0) {
          console.log("✅ Returning cached transactions");
          const hasMore = cached.length >= limit;
          const nextCursor = hasMore ? cached[limit - 1]?.signature : undefined;
          return {
            transactions: cached.slice(0, limit),
            hasMore,
            nextCursor,
          };
        }
      }
    }

    console.log(
      `🔍 Fetching transactions for: ${walletAddress} ${
        before ? `(before: ${before.slice(0, 8)}...)` : "(first page)"
      }`
    );
    const publicKey = new PublicKey(walletAddress);

    // Get signatures with pagination support
    const signatures = await rateLimitedRequest(() =>
      connection.getSignaturesForAddress(publicKey, {
        limit: limit + 1, // Get one extra to check if there are more
        before: before ? before : undefined,
      })
    );

    console.log(`📝 Found ${signatures.length} signatures`);

    if (signatures.length === 0) {
      return {
        transactions: [],
        hasMore: false,
      };
    }

    // Check if there are more transactions
    const hasMore = signatures.length > limit;
    const signaturesToProcess = hasMore
      ? signatures.slice(0, limit)
      : signatures;
    const nextCursor = hasMore
      ? signaturesToProcess[signaturesToProcess.length - 1]?.signature
      : undefined;

    // Process transactions in small batches for optimal performance
    const transactions: Transaction[] = [];
    const batchSize = 3; // Small batches to avoid rate limits

    for (let i = 0; i < signaturesToProcess.length; i += batchSize) {
      const batch = signaturesToProcess.slice(i, i + batchSize);
      console.log(
        `🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          signaturesToProcess.length / batchSize
        )}`
      );

      // Process batch with rate limiting
      const batchPromises = batch.map(async (sig) => {
        try {
          return await rateLimitedRequest(() =>
            connection.getParsedTransaction(sig.signature, {
              maxSupportedTransactionVersion: 0,
            })
          );
        } catch (error) {
          console.warn(`Failed to fetch transaction ${sig.signature}:`, error);
          return null;
        }
      });

      const batchResults = await Promise.all(batchPromises);

      // Parse results for this batch
      for (const tx of batchResults) {
        if (tx) {
          const parsed = await parseTransactionOptimized(tx, walletAddress);
          if (parsed) {
            transactions.push(parsed);
          }
        }
      }

      // Small delay between batches to prevent 429 errors
      if (i + batchSize < signaturesToProcess.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // Sort by timestamp
    const sortedTransactions = transactions.sort(
      (a, b) => b.timestamp - a.timestamp
    );

    // Cache first page only
    if (!before && sortedTransactions.length > 0) {
      transactionCache.set(walletAddress, sortedTransactions);
      cacheTimestamps.set(walletAddress, Date.now());

      // Cleanup cache periodically
      cleanupCache();
    }

    console.log(
      `✅ Successfully processed ${sortedTransactions.length} transactions ${
        hasMore ? "(more available)" : "(all loaded)"
      }`
    );

    return {
      transactions: sortedTransactions,
      hasMore,
      nextCursor,
    };
  } catch (error) {
    console.error("❌ Error fetching wallet transactions:", error);

    // Return cached data if available, even if stale (first page only)
    if (!options.before) {
      const cached = transactionCache.get(walletAddress);
      if (cached) {
        console.log("⚠️ Returning stale cached data due to error");
        return {
          transactions: cached.slice(0, options.limit || 15),
          hasMore: cached.length > (options.limit || 15),
          nextCursor:
            cached[Math.min(cached.length - 1, (options.limit || 15) - 1)]
              ?.signature,
        };
      }
    }

    throw new Error("Failed to fetch transactions");
  }
}

export { formatTimeAgo, shortenAddress };
