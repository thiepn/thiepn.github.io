/**
 * Exact Money & Currency Representation for Phase P53
 * 
 * Strict minor-units integer arithmetic to prevent floating point inaccuracies.
 * Multi-currency metadata supporting 0-decimal, 2-decimal, and 3-decimal currencies.
 */

export interface CurrencyMetadata {
  code: string;
  symbol: string;
  name: string;
  minorUnits: number; // e.g. 2 for USD/EUR, 0 for JPY/KRW, 3 for BHD/KWD/TND
  symbolPlacement: 'prefix' | 'suffix';
  decimalSeparator: string;
  thousandsSeparator: string;
}

export const CURRENCY_REGISTRY: Record<string, CurrencyMetadata> = {
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    minorUnits: 2,
    symbolPlacement: 'prefix',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    minorUnits: 2,
    symbolPlacement: 'suffix',
    decimalSeparator: ',',
    thousandsSeparator: '.',
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    minorUnits: 2,
    symbolPlacement: 'prefix',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  JPY: {
    code: 'JPY',
    symbol: '¥',
    name: 'Japanese Yen',
    minorUnits: 0,
    symbolPlacement: 'prefix',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  CHF: {
    code: 'CHF',
    symbol: 'CHF ',
    name: 'Swiss Franc',
    minorUnits: 2,
    symbolPlacement: 'prefix',
    decimalSeparator: '.',
    thousandsSeparator: "'",
  },
  CAD: {
    code: 'CAD',
    symbol: 'CA$',
    name: 'Canadian Dollar',
    minorUnits: 2,
    symbolPlacement: 'prefix',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  AUD: {
    code: 'AUD',
    symbol: 'A$',
    name: 'Australian Dollar',
    minorUnits: 2,
    symbolPlacement: 'prefix',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    minorUnits: 2,
    symbolPlacement: 'prefix',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  CNY: {
    code: 'CNY',
    symbol: '¥',
    name: 'Chinese Yuan',
    minorUnits: 2,
    symbolPlacement: 'prefix',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  BRL: {
    code: 'BRL',
    symbol: 'R$',
    name: 'Brazilian Real',
    minorUnits: 2,
    symbolPlacement: 'prefix',
    decimalSeparator: ',',
    thousandsSeparator: '.',
  },
  KRW: {
    code: 'KRW',
    symbol: '₩',
    name: 'South Korean Won',
    minorUnits: 0,
    symbolPlacement: 'prefix',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  SEK: {
    code: 'SEK',
    symbol: ' kr',
    name: 'Swedish Krona',
    minorUnits: 2,
    symbolPlacement: 'suffix',
    decimalSeparator: ',',
    thousandsSeparator: ' ',
  },
  NOK: {
    code: 'NOK',
    symbol: ' kr',
    name: 'Norwegian Krone',
    minorUnits: 2,
    symbolPlacement: 'suffix',
    decimalSeparator: ',',
    thousandsSeparator: ' ',
  },
  DKK: {
    code: 'DKK',
    symbol: ' kr',
    name: 'Danish Krone',
    minorUnits: 2,
    symbolPlacement: 'suffix',
    decimalSeparator: ',',
    thousandsSeparator: '.',
  },
  PLN: {
    code: 'PLN',
    symbol: ' zł',
    name: 'Polish Zloty',
    minorUnits: 2,
    symbolPlacement: 'suffix',
    decimalSeparator: ',',
    thousandsSeparator: ' ',
  },
  SGD: {
    code: 'SGD',
    symbol: 'S$',
    name: 'Singapore Dollar',
    minorUnits: 2,
    symbolPlacement: 'prefix',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  NZD: {
    code: 'NZD',
    symbol: 'NZ$',
    name: 'New Zealand Dollar',
    minorUnits: 2,
    symbolPlacement: 'prefix',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  MXN: {
    code: 'MXN',
    symbol: 'Mex$',
    name: 'Mexican Peso',
    minorUnits: 2,
    symbolPlacement: 'prefix',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  ZAR: {
    code: 'ZAR',
    symbol: 'R ',
    name: 'South African Rand',
    minorUnits: 2,
    symbolPlacement: 'prefix',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  KWD: {
    code: 'KWD',
    symbol: 'KD ',
    name: 'Kuwaiti Dinar',
    minorUnits: 3,
    symbolPlacement: 'prefix',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  BHD: {
    code: 'BHD',
    symbol: 'BD ',
    name: 'Bahraini Dinar',
    minorUnits: 3,
    symbolPlacement: 'prefix',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
  TND: {
    code: 'TND',
    symbol: 'DT ',
    name: 'Tunisian Dinar',
    minorUnits: 3,
    symbolPlacement: 'prefix',
    decimalSeparator: '.',
    thousandsSeparator: ',',
  },
};

export const DEFAULT_CURRENCY = 'USD';

export interface Money {
  amountMinor: number; // Integer minor units (e.g. $10.50 -> 1050, ¥500 -> 500)
  currency: string;    // ISO 4217 code
}

export function getCurrencyMetadata(currency = DEFAULT_CURRENCY): CurrencyMetadata {
  const code = (currency || DEFAULT_CURRENCY).toUpperCase();
  return (
    CURRENCY_REGISTRY[code] || {
      code,
      symbol: `${code} `,
      name: code,
      minorUnits: 2,
      symbolPlacement: 'prefix',
      decimalSeparator: '.',
      thousandsSeparator: ',',
    }
  );
}

/**
 * Creates a Money object safely from minor units integer
 */
export function createMoney(amountMinor: number, currency = DEFAULT_CURRENCY): Money {
  const safeMinor = Math.round(Number.isFinite(amountMinor) ? amountMinor : 0);
  return {
    amountMinor: safeMinor,
    currency: (currency || DEFAULT_CURRENCY).toUpperCase(),
  };
}

/**
 * Converts a decimal number (like 12.34) into exact Money with minor units
 */
export function moneyFromDecimal(decimalAmount: number, currency = DEFAULT_CURRENCY): Money {
  const meta = getCurrencyMetadata(currency);
  const factor = Math.pow(10, meta.minorUnits);
  const amountMinor = Math.round(decimalAmount * factor);
  return createMoney(amountMinor, currency);
}

/**
 * Converts Money into a numeric decimal float (strictly for display/charting, not canonical computation)
 */
export function moneyToDecimal(money: Money): number {
  const meta = getCurrencyMetadata(money.currency);
  const factor = Math.pow(10, meta.minorUnits);
  return money.amountMinor / factor;
}

/**
 * Parses user input string into a Money object.
 * Handles negative notation: -$12.34, ($12.34), -12,34 EUR.
 * Handles various decimal and thousands separators defensively.
 */
export function parseMoneyInput(input: string, currency = DEFAULT_CURRENCY): Money {
  if (!input || typeof input !== 'string') {
    return createMoney(0, currency);
  }

  const meta = getCurrencyMetadata(currency);
  let cleaned = input.trim();

  // Check for accounting parentheses negative (e.g. (100.50))
  let isNegative = false;
  if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
    isNegative = true;
    cleaned = cleaned.slice(1, -1).trim();
  } else if (cleaned.startsWith('-')) {
    isNegative = true;
    cleaned = cleaned.slice(1).trim();
  } else if (cleaned.endsWith('-')) {
    isNegative = true;
    cleaned = cleaned.slice(0, -1).trim();
  }

  // Strip currency symbols and letters
  cleaned = cleaned.replace(/[^0-9.,]/g, '');

  if (!cleaned) {
    return createMoney(0, currency);
  }

  // Determine decimal vs thousand separator
  const hasComma = cleaned.includes(',');
  const hasDot = cleaned.includes('.');

  let standardized = cleaned;
  if (hasComma && hasDot) {
    // Both present: the last one is the decimal separator
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    if (lastComma > lastDot) {
      // European format: 1.234,56 -> 1234.56
      standardized = cleaned.replace(/\./g, '').replace(',', '.');
    } else {
      // US format: 1,234.56 -> 1234.56
      standardized = cleaned.replace(/,/g, '');
    }
  } else if (hasComma && !hasDot) {
    // Only comma
    if (meta.decimalSeparator === ',') {
      standardized = cleaned.replace(',', '.');
    } else {
      // Check if it's thousands or decimal (e.g. 1,50 vs 1,000)
      const parts = cleaned.split(',');
      if (parts.length === 2 && parts[1].length <= meta.minorUnits) {
        standardized = cleaned.replace(',', '.');
      } else {
        standardized = cleaned.replace(/,/g, '');
      }
    }
  }

  const parsedFloat = parseFloat(standardized);
  if (isNaN(parsedFloat)) {
    return createMoney(0, currency);
  }

  const factor = Math.pow(10, meta.minorUnits);
  const minor = Math.round(parsedFloat * factor);
  return createMoney(isNegative ? -minor : minor, currency);
}

export interface FormatMoneyOptions {
  showSymbol?: boolean;
  showCurrencyCode?: boolean;
  forceSign?: boolean;
  compact?: boolean;
}

/**
 * Formats a Money object into localized string representation
 */
export function formatMoney(money: Money | number, currency = DEFAULT_CURRENCY, options: FormatMoneyOptions = {}): string {
  let m: Money;
  if (typeof money === 'number') {
    m = createMoney(money, currency);
  } else {
    m = money || createMoney(0, currency);
  }

  const meta = getCurrencyMetadata(m.currency);
  const isNegative = m.amountMinor < 0;
  const absMinor = Math.abs(m.amountMinor);
  const factor = Math.pow(10, meta.minorUnits);

  let formattedNumber = '';

  if (options.compact && absMinor >= 1_000_000 * factor) {
    const millions = (absMinor / (1_000_000 * factor)).toFixed(1);
    formattedNumber = `${millions}M`;
  } else if (options.compact && absMinor >= 1_000 * factor) {
    const thousands = (absMinor / (1_000 * factor)).toFixed(1);
    formattedNumber = `${thousands}k`;
  } else {
    const whole = Math.floor(absMinor / factor);
    const wholeFormatted = whole.toString().replace(/\B(?=(\d{3})+(?!\d))/g, meta.thousandsSeparator);

    if (meta.minorUnits > 0) {
      const frac = absMinor % factor;
      const fracFormatted = frac.toString().padStart(meta.minorUnits, '0');
      formattedNumber = `${wholeFormatted}${meta.decimalSeparator}${fracFormatted}`;
    } else {
      formattedNumber = wholeFormatted;
    }
  }

  const sign = isNegative ? '-' : options.forceSign && m.amountMinor > 0 ? '+' : '';
  const showSymbol = options.showSymbol !== false;

  let result = '';
  if (showSymbol) {
    if (meta.symbolPlacement === 'prefix') {
      result = `${sign}${meta.symbol}${formattedNumber}`;
    } else {
      result = `${sign}${formattedNumber}${meta.symbol}`;
    }
  } else {
    result = `${sign}${formattedNumber}`;
  }

  if (options.showCurrencyCode) {
    result += ` ${meta.code}`;
  }

  return result;
}

/**
 * Exact mathematical operations
 */
export function addMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot add different currencies without explicit rate: ${a.currency} and ${b.currency}`);
  }
  return createMoney(a.amountMinor + b.amountMinor, a.currency);
}

export function subtractMoney(a: Money, b: Money): Money {
  if (a.currency !== b.currency) {
    throw new Error(`Cannot subtract different currencies without explicit rate: ${a.currency} and ${b.currency}`);
  }
  return createMoney(a.amountMinor - b.amountMinor, a.currency);
}

export function multiplyMoney(m: Money, factor: number): Money {
  return createMoney(Math.round(m.amountMinor * factor), m.currency);
}

export function divideMoney(m: Money, divisor: number): Money {
  if (divisor === 0) {
    throw new Error('Division by zero in Money arithmetic');
  }
  return createMoney(Math.round(m.amountMinor / divisor), m.currency);
}

export function sumMoney(items: Money[], currency = DEFAULT_CURRENCY): Money {
  if (!items || items.length === 0) {
    return createMoney(0, currency);
  }
  const targetCurrency = (currency || items[0]?.currency || DEFAULT_CURRENCY).toUpperCase();
  let totalMinor = 0;
  for (const item of items) {
    if (item.currency && item.currency.toUpperCase() !== targetCurrency) {
      throw new Error(`Mismatch in sumMoney: expected ${targetCurrency}, found ${item.currency}`);
    }
    totalMinor += item.amountMinor;
  }
  return createMoney(totalMinor, targetCurrency);
}

export function compareMoney(a: Money, b: Money): number {
  if (a.currency !== b.currency) {
    return a.currency.localeCompare(b.currency);
  }
  return a.amountMinor - b.amountMinor;
}

export function isZeroMoney(m: Money): boolean {
  return !m || m.amountMinor === 0;
}

export function isPositiveMoney(m: Money): boolean {
  return !!m && m.amountMinor > 0;
}

export function isNegativeMoney(m: Money): boolean {
  return !!m && m.amountMinor < 0;
}

export function negateMoney(m: Money): Money {
  return createMoney(-m.amountMinor, m.currency);
}

export function absMoney(m: Money): Money {
  return createMoney(Math.abs(m.amountMinor), m.currency);
}

export function moneyToDecimalString(m: Money): string {
  const meta = getCurrencyMetadata(m.currency);
  const factor = Math.pow(10, meta.minorUnits);
  const isNegative = m.amountMinor < 0;
  const absMinor = Math.abs(m.amountMinor);

  if (meta.minorUnits === 0) {
    return `${isNegative ? '-' : ''}${absMinor}`;
  }

  const whole = Math.floor(absMinor / factor);
  const frac = (absMinor % factor).toString().padStart(meta.minorUnits, '0');
  return `${isNegative ? '-' : ''}${whole}.${frac}`;
}
