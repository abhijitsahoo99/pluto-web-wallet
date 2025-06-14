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
