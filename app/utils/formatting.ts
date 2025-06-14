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

export function formatLargeNumber(
  num: number,
  options: {
    decimals?: number;
    forceDecimals?: boolean;
    useShortForm?: boolean;
  } = {}
): string {
  const { decimals = 2, forceDecimals = false, useShortForm = true } = options;

  if (num === 0) return "0";
  if (!isFinite(num)) return "0";

  const absNum = Math.abs(num);
  const sign = num < 0 ? "-" : "";

  if (useShortForm) {
    if (absNum >= 1e12) return `${sign}${(absNum / 1e12).toFixed(decimals)}T`;
    if (absNum >= 1e9) return `${sign}${(absNum / 1e9).toFixed(decimals)}B`;
    if (absNum >= 1e6) return `${sign}${(absNum / 1e6).toFixed(decimals)}M`;
    if (absNum >= 1e3) return `${sign}${(absNum / 1e3).toFixed(decimals)}K`;
  }

  if (forceDecimals || absNum % 1 !== 0) {
    return `${sign}${absNum.toFixed(decimals)}`;
  }

  return `${sign}${Math.floor(absNum).toLocaleString()}`;
}

export function formatCurrency(
  amount: number,
  options: {
    currency?: string;
    minimumFractionDigits?: number;
    maximumFractionDigits?: number;
    useShortForm?: boolean;
  } = {}
): string {
  const {
    currency = "USD",
    minimumFractionDigits = 2,
    maximumFractionDigits = 6,
    useShortForm = false,
  } = options;

  if (!isFinite(amount) || isNaN(amount)) return "$0.00";

  const absAmount = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";

  // For very small amounts, show more precision
  if (absAmount > 0 && absAmount < 0.01) {
    const formatted = absAmount.toFixed(6);
    return `${sign}$${formatted}`;
  }

  // Use short form for large numbers
  if (useShortForm && absAmount >= 1000) {
    const shortForm = formatLargeNumber(absAmount, {
      decimals: 1,
      useShortForm: true,
    });
    return `${sign}$${shortForm}`;
  }

  // Standard formatting
  try {
    const formatted = new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits,
      maximumFractionDigits,
    }).format(absAmount);

    return sign + formatted;
  } catch (error) {
    // Fallback formatting
    return `${sign}$${absAmount.toFixed(2)}`;
  }
}

export function shortenAddress(address: string): string {
  if (!address || address.length < 8) return address;
  return `${address.slice(0, 4)}...${address.slice(-4)}`;
}
