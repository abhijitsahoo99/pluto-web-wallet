# Pluto Wallet Web App

##  Features

### Authentication & Wallet

- **Privy Social Authentication**: Seamless login with Google and Twitter
- **Embedded Wallet**: Non-custodial wallet automatically created for each user
- **Solana Integration**: Native SOL and SPL token support

### Core Wallet Functionality

- **Portfolio Dashboard**: Real-time balance tracking and net worth calculation
- **Send Tokens**: Transfer SOL and SPL tokens to any Solana address
- **Receive Tokens**: Generate QR codes and copy wallet addresses
- **Token Swap**: Integrated DEX functionality for token exchanges
- **Transaction History**: Complete transaction tracking with detailed views

### Advanced Features

- **Token Analytics**: Comprehensive token analysis with security scoring
- **Price Tracking**: Real-time price data and 24h change indicators
- **Top Holders Analysis**: Token distribution and holder insights
- **Market Data**: Volume, liquidity, and trading metrics

##  Tech Stack

- **Frontend**: Next.js 15, React, TypeScript, Tailwind CSS
- **Authentication**: Privy (Social + Embedded Wallet)
- **Blockchain**: Solana Web3.js, SPL Token
- **Charts**: Recharts for price visualization
- **Deployment**: Vercel

##  APIs & Data Sources

### Primary APIs

1. **Helius RPC API**

   - **Purpose**: Solana blockchain data, token balances, transaction history
   - **Usage**: Wallet balance queries, transaction fetching, token metadata
   - **Why**: Reliable, fast Solana RPC with enhanced indexing

2. **Jupiter API**

   - **Purpose**: Token prices, swap functionality, token metadata
   - **Usage**: Real-time pricing, swap quotes, token discovery
   - **Why**: Most comprehensive Solana token aggregator

3. **DexScreener API**

   - **Purpose**: Fallback pricing, market data, trading analytics
   - **Usage**: Token analytics, volume data, price charts
   - **Why**: Reliable fallback when Jupiter data unavailable

4. **CoinGecko API**
   - **Purpose**: SOL price data and market metrics
   - **Usage**: Native SOL pricing and market cap data
   - **Why**: Trusted source for major cryptocurrency data

## Architecture

#### Authentication (`Privy`)

- Social login integration
- Embedded wallet creation
- Secure key management
- Cross-platform compatibility

#### Wallet Operations (`lib/solana.ts`)

- **Balance Fetching**: Multi-token balance queries via Helius RPC
- **Token Metadata**: Jupiter API for token information with DexScreener fallback
- **Price Integration**: Real-time pricing from multiple sources
- **Error Handling**: Graceful fallbacks and retry mechanisms

#### Transaction System (`lib/transactions.ts`)

- **History Fetching**: Comprehensive transaction parsing via Helius
- **Transaction Types**: Send, receive, swap classification
- **Status Tracking**: Real-time confirmation monitoring
- **Pagination**: Efficient large dataset handling

#### Token Analytics (`lib/tokenAnalytics.ts`)

- **Security Analysis**: Risk scoring based on liquidity, metadata, trading activity
- **Top Holders**: Real token distribution via Helius `getTokenLargestAccounts`
- **Market Metrics**: Volume, trades, and liquidity analysis
- **Price History**: Historical price chart generation


### Environment Variables

```env
NEXT_PUBLIC_PRIVY_APP_ID=your_privy_app_id
NEXT_PUBLIC_HELIUS_API_KEY=your_helius_key
NEXT_PUBLIC_SOLANA_RPC_URL=your_rpc_endpoint
```

## Data Flow

1. **User Authentication**: Privy handles social login + wallet creation
2. **Balance Loading**: Helius RPC fetches all token balances
3. **Price Enrichment**: Jupiter API adds USD values and metadata
4. **Analytics Generation**: Multi-source data aggregation for insights
5. **Transaction Processing**: Solana Web3.js handles blockchain interactions

### Primary → Fallback Chain

1. **Jupiter** (primary) → **DexScreener** (fallback) for token data
2. **Helius** (primary) → **Public RPC** (fallback) for blockchain data
3. **CoinGecko** (dedicated) for SOL-specific metrics

### Rate Limiting & Caching

- 2-second intervals between API calls
- 5-minute cache for analytics data
- Graceful degradation on API failures



