import {
  Connection,
  PublicKey,
  ParsedTransactionWithMeta,
  ConfirmedSignatureInfo,
} from "@solana/web3.js";
import { connection } from "./solana";

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

// Enhanced token registry with more tokens
const TOKEN_REGISTRY: Record<
  string,
  { symbol: string; name: string; decimals: number }
> = {
  So11111111111111111111111111111111111111112: {
    symbol: "SOL",
    name: "Solana",
    decimals: 9,
  },
  EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v: {
    symbol: "USDC",
    name: "USD Coin",
    decimals: 6,
  },
  Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB: {
    symbol: "USDT",
    name: "Tether USD",
    decimals: 6,
  },
  mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So: {
    symbol: "mSOL",
    name: "Marinade SOL",
    decimals: 9,
  },
  SRMuApVNdxXokk5GT7XD5cUUgXMBCoAz2LHeuAoKWRt: {
    symbol: "SRM",
    name: "Serum",
    decimals: 6,
  },
  // Add more common tokens to reduce API calls
  "4k3Dyjzvzp8eMZWUXbBCjEvwSkkk59S5iCNLY3QrkX6R": {
    symbol: "RAY",
    name: "Raydium",
    decimals: 6,
  },
  "9n4nbM75f5Ui33ZbPYXn59EwSgE8CGsHtAeTH5YFeJ9E": {
    symbol: "BTC",
    name: "Bitcoin (Portal)",
    decimals: 8,
  },
};

// Transaction cache to avoid refetching
const transactionCache = new Map<string, Transaction[]>();
const CACHE_DURATION = 30000; // 30 seconds
const cacheTimestamps = new Map<string, number>();

// Rate limiting
let lastRequestTime = 0;
const MIN_REQUEST_INTERVAL = 100; // 100ms between requests

function getTokenInfo(mint: string) {
  return (
    TOKEN_REGISTRY[mint] || {
      symbol: mint.slice(0, 6),
      name: "Unknown Token",
      decimals: 9,
    }
  );
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
  return requestFn();
}

// Enhanced swap detection
function detectSwapTransaction(
  tx: ParsedTransactionWithMeta,
  walletAddress: string
): Transaction | null {
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
    if (Math.abs(solChange) > 0.001) {
      tokenChanges.set("So11111111111111111111111111111111111111112", {
        pre: tx.meta.preBalances[walletIndex] / 1e9,
        post: tx.meta.postBalances[walletIndex] / 1e9,
        change: solChange,
      });
    }
  }

  // Find tokens that decreased (sold) and increased (bought)
  let fromToken = "";
  let fromSymbol = "";
  let fromAmount = 0;
  let toToken = "";
  let toSymbol = "";
  let toAmount = 0;

  for (const [mint, data] of Array.from(tokenChanges.entries())) {
    if (data.change < -0.000001) {
      // Token decreased (sold)
      fromToken = mint;
      fromAmount = Math.abs(data.change);
      fromSymbol = getTokenInfo(mint).symbol;
    } else if (data.change > 0.000001) {
      // Token increased (bought)
      toToken = mint;
      toAmount = data.change;
      toSymbol = getTokenInfo(mint).symbol;
    }
  }

  // If we found both from and to tokens, it's a swap
  if (fromToken && toToken && fromAmount > 0 && toAmount > 0) {
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
function parseTransactionOptimized(
  tx: ParsedTransactionWithMeta,
  walletAddress: string
): Transaction | null {
  if (!tx.meta || tx.meta.err) {
    return null;
  }

  const signature = tx.transaction.signatures[0];
  const timestamp = tx.blockTime || 0;
  const fee = (tx.meta.fee || 0) / 1e9;
  const slot = tx.slot;

  // First check if it's a swap
  const swapTx = detectSwapTransaction(tx, walletAddress);
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
        const tokenInfo = getTokenInfo(mint);
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

// Batch transaction fetching with optimizations
export async function getWalletTransactions(
  walletAddress: string
): Promise<Transaction[]> {
  try {
    // Check cache first
    const cacheKey = walletAddress;
    const cachedTime = cacheTimestamps.get(cacheKey);
    const now = Date.now();

    if (cachedTime && now - cachedTime < CACHE_DURATION) {
      const cached = transactionCache.get(cacheKey);
      if (cached) {
        console.log("✅ Returning cached transactions");
        return cached;
      }
    }

    console.log("🔍 Fetching fresh transactions for:", walletAddress);
    const publicKey = new PublicKey(walletAddress);

    // Get more signatures to cover longer history (increased from 20 to 50)
    const signatures = await rateLimitedRequest(() =>
      connection.getSignaturesForAddress(publicKey, {
        limit: 50, // Increased limit for longer history
      })
    );

    console.log(`📝 Found ${signatures.length} signatures`);

    if (signatures.length === 0) {
      return [];
    }

    // Batch fetch transactions - but limit concurrent requests
    const transactions: Transaction[] = [];
    const batchSize = 3; // Small batch size to avoid rate limits

    for (let i = 0; i < signatures.length; i += batchSize) {
      const batch = signatures.slice(i, i + batchSize);
      console.log(
        `🔄 Processing batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(
          signatures.length / batchSize
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

      // Parse results
      for (const tx of batchResults) {
        if (tx) {
          const parsed = parseTransactionOptimized(tx, walletAddress);
          if (parsed) {
            transactions.push(parsed);
          }
        }
      }

      // Add delay between batches to avoid rate limiting
      if (i + batchSize < signatures.length) {
        await new Promise((resolve) => setTimeout(resolve, 200));
      }
    }

    // Sort by timestamp
    const sortedTransactions = transactions.sort(
      (a, b) => b.timestamp - a.timestamp
    );

    // Cache results
    transactionCache.set(cacheKey, sortedTransactions);
    cacheTimestamps.set(cacheKey, now);

    console.log(
      `✅ Successfully processed ${sortedTransactions.length} transactions`
    );
    return sortedTransactions;
  } catch (error) {
    console.error("❌ Error fetching wallet transactions:", error);

    // Return cached data if available, even if stale
    const cached = transactionCache.get(walletAddress);
    if (cached) {
      console.log("⚠️ Returning stale cached data due to error");
      return cached;
    }

    throw new Error("Failed to fetch transactions");
  }
}

export { formatTimeAgo, shortenAddress };
