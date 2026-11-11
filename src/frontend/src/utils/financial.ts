/**
 * Centralized Financial Data Normalization and Formatting Utilities
 * Provides resilient, defensive parsing and institutional formatting for
 * ratios, prices, percentages, market capitalizations, and financial statements.
 */

/**
 * Safely parses any value (number, numeric string, null, undefined) into a finite number.
 * Returns null if the value is missing, non-numeric, NaN, or non-finite.
 * NEVER silently converts missing or invalid values into 0.
 */
export function parseFinancialNumber(val: any): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number') {
    return isFinite(val) && !isNaN(val) ? val : null;
  }
  if (typeof val === 'string') {
    const cleaned = val.trim();
    if (cleaned === '' || cleaned === '—' || cleaned === '-' || cleaned.toUpperCase() === 'N/A' || cleaned.toUpperCase() === 'NAN') {
      return null;
    }
    // Remove currency signs, commas, and trailing percentage symbols
    const sanitized = cleaned.replace(/[\$,]/g, '').replace(/%$/, '');
    const parsed = parseFloat(sanitized);
    return isFinite(parsed) && !isNaN(parsed) ? parsed : null;
  }
  return null;
}

/**
 * Formats a financial ratio (e.g. P/E ratio, Debt/Equity, Current Ratio).
 * Example: 24.524 -> "24.52", null -> "—"
 */
export function formatRatio(val: any, decimals: number = 2, fallback: string = '—'): string {
  const num = parseFinancialNumber(val);
  if (num === null) return fallback;
  return num.toFixed(decimals);
}

/**
 * Formats a percentage value (e.g. ROE, Margins, Price Change %).
 * @param alreadyPercent If true, assumes 15.5 represents 15.5%. If false, multiplies 0.155 by 100.
 */
export function formatPercent(
  val: any,
  decimals: number = 2,
  alreadyPercent: boolean = true,
  fallback: string = '—'
): string {
  const num = parseFinancialNumber(val);
  if (num === null) return fallback;
  const computed = alreadyPercent ? num : num * 100;
  return `${computed.toFixed(decimals)}%`;
}

/**
 * Formats a currency amount with thousands separators.
 * Example: 12450.5 -> "$12,450.50"
 */
export function formatCurrency(
  val: any,
  decimals: number = 2,
  currencySymbol: string = '$',
  fallback: string = '—'
): string {
  const num = parseFinancialNumber(val);
  if (num === null) return fallback;
  return `${currencySymbol}${num.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * Formats large market values into billions ($B) or millions ($M).
 * Example: 2500000000000 -> "$2,500.00B"
 */
export function formatBillions(
  val: any,
  decimals: number = 2,
  prefix: string = '$',
  suffix: string = 'B',
  fallback: string = '—'
): string {
  const num = parseFinancialNumber(val);
  if (num === null) return fallback;
  const inBillions = num / 1e9;
  return `${prefix}${inBillions.toLocaleString('en-US', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`;
}

/**
 * Formats integer values (volumes, counts, shares) with commas.
 * Example: 1542030 -> "1,542,030"
 */
export function formatInteger(val: any, fallback: string = '—'): string {
  const num = parseFinancialNumber(val);
  if (num === null) return fallback;
  return Math.round(num).toLocaleString('en-US');
}

/**
 * Formats price change and percentage with leading +/- indicators.
 * Example: +2.50 (+1.25%)
 */
export function formatChange(
  change: any,
  changePercent: any,
  fallback: string = '—'
): string {
  const chg = parseFinancialNumber(change);
  const chgPct = parseFinancialNumber(changePercent);

  if (chg === null && chgPct === null) return fallback;

  const isPos = (chg ?? chgPct ?? 0) >= 0;
  const sign = isPos ? '+' : '';

  const chgPart = chg !== null ? `${sign}${chg.toFixed(2)}` : '';
  const pctPart = chgPct !== null ? `${sign}${chgPct.toFixed(2)}%` : '';

  if (chgPart && pctPart) {
    return `${chgPart} (${pctPart})`;
  }
  return chgPart || pctPart || fallback;
}

/**
 * Formats a score with optional sign.
 */
export function formatScore(score: any, decimals: number = 2, fallback: string = '—'): string {
  const num = parseFinancialNumber(score);
  if (num === null) return fallback;
  return num > 0 ? `+${num.toFixed(decimals)}` : num.toFixed(decimals);
}
