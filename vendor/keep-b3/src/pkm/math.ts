import katex from 'katex';

export interface KatexRenderResult {
  html: string;
  isError: boolean;
  errorMessage?: string;
}

/**
 * Renders LaTeX expression using KaTeX with robust error handling and no crashes.
 */
export function renderKatex(
  expression: string,
  displayMode = false
): KatexRenderResult {
  const trimmed = expression.trim();
  if (!trimmed) {
    return { html: '', isError: false };
  }

  try {
    const html = katex.renderToString(trimmed, {
      displayMode,
      throwOnError: true, // Throw so we capture precise syntax errors in catch block
      strict: false,
      trust: false, // Security: do not execute untrusted commands
      output: 'htmlAndMathml',
    });

    return {
      html,
      isError: false,
    };
  } catch (err: any) {
    // Generate safe fallback HTML with informative error tooltip without crashing
    const safeErrorMsg = err?.message || 'KaTeX parse error';
    return {
      html: `<span class="katex-error text-rose-500 font-mono text-xs cursor-help border-b border-dotted border-rose-400" title="${safeErrorMsg}">${trimmed}</span>`,
      isError: true,
      errorMessage: safeErrorMsg,
    };
  }
}

/**
 * Smart heuristic to check if a token like $...$ is inline math vs. currency.
 * Returns true if it represents a mathematical formula.
 */
export function isLikelyMathFormula(content: string): boolean {
  const trimmed = content.trim();
  if (!trimmed) return false;

  // If it's pure currency like "100", "5.99", "1,000", "50-100", "20k", "50 million", "100/mo", "25%"
  if (
    /^[\d,.]+(\s*(?:k|m|b|million|billion|thousand|usd|eur|gbp|cents?|dollars?|%|\/(?:mo|yr|hr|day|week|month|year|mth|ea|person|user|item)))?$/i.test(
      trimmed
    )
  ) {
    return false;
  }

  // Currency ranges like "10 to 20" or "50 - 100"
  if (/^[\d,.]+\s*(?:to|-)\s*[\d,.]+$/i.test(trimmed)) {
    return false;
  }

  // Strong math indicators: backslashes (\alpha, \sum, \frac), operators (=, +, -, *, /, ^, _, \), superscripts, brackets
  if (/\\[a-zA-Z]+|[=^_\\{}<>±×÷≈≠≤≥∑∫√∂π]/.test(trimmed)) {
    return true;
  }

  // Variables like "x", "x_i", "a + b", "f(x)", "2x"
  if (/[a-zA-Z]/.test(trimmed)) {
    return true;
  }

  return false;
}
