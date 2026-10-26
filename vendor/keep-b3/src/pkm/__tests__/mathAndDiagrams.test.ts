import { renderKatex, isLikelyMathFormula } from '../math';
import { parseInlineMarkdown } from '../PKMPreviewRenderer';
import { resolveTransclusion } from '../transclusion';
import { buildVaultIndex } from '../vaultIndex';

export interface TestResult {
  passed: number;
  failed: number;
  errors: string[];
}

export function runMathAndDiagramTests(): TestResult {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(`Assertion failed: ${msg}`);
      console.error(`  FAIL: ${msg}`);
    }
  }

  // 1. KaTeX math rendering valid expressions
  try {
    const inlineRes = renderKatex('\\sum_{i=1}^n x_i', false);
    assert(!inlineRes.isError, 'KaTeX renders valid inline summation formula without error');
    assert(inlineRes.html.includes('katex'), 'KaTeX output HTML contains katex class structure');

    const displayRes = renderKatex('E = mc^2', true);
    assert(!displayRes.isError, 'KaTeX renders valid display formula without error');
    assert(displayRes.html.includes('katex-display') || displayRes.html.includes('katex'), 'Display mode KaTeX structure verified');
  } catch (err: any) {
    failed++;
    errors.push(`KaTeX render throw: ${err.message}`);
  }

  // 2. KaTeX error handling for malformed expressions
  try {
    const malformed = renderKatex('\\invalidCommandThatDoesNotExist{123}', false);
    assert(malformed.isError, 'Malformed KaTeX flags isError=true');
    assert(typeof malformed.errorMessage === 'string' && malformed.errorMessage.length > 0, 'Malformed KaTeX returns human-readable error message');
    assert(typeof malformed.html === 'string', 'Malformed KaTeX returns fallback HTML without throwing');
  } catch (err: any) {
    failed++;
    errors.push(`KaTeX error throw: ${err.message}`);
  }

  // 3. Currency vs Math Heuristics
  try {
    assert(!isLikelyMathFormula('100'), 'Plain number 100 is not math');
    assert(!isLikelyMathFormula('50.00'), 'Decimal currency 50.00 is not math');
    assert(!isLikelyMathFormula('1,000,000'), 'Formatted currency is not math');
    assert(!isLikelyMathFormula('20 to 50'), 'Currency range is not math');
    assert(!isLikelyMathFormula('100/mo'), 'Per-month pricing is not math');
    assert(!isLikelyMathFormula('25%'), 'Percentage is not math');

    assert(isLikelyMathFormula('x + y = z'), 'Standard algebra is math');
    assert(isLikelyMathFormula('E = mc^2'), 'Formula with power/equals is math');
    assert(isLikelyMathFormula('\\alpha + \\beta'), 'Formula with LaTeX slash command is math');
    assert(isLikelyMathFormula('\\sum_{i=1}^n x_i'), 'Summation formula is math');
    assert(isLikelyMathFormula('a_i \\cdot b_i'), 'Subscript and cdot is math');
    assert(isLikelyMathFormula('\\frac{a}{b}'), 'Fraction is math');
    assert(isLikelyMathFormula('f(x)'), 'Function notation is math');
  } catch (err: any) {
    failed++;
    errors.push(`Math heuristic throw: ${err.message}`);
  }

  // 4. Inline Tokenizer math and dollar escaping
  try {
    const tokens = parseInlineMarkdown('The energy formula is $E = mc^2$ and not money.');
    const mathToken = tokens.find((t) => t.type === 'inlinemath');
    assert(!!mathToken, 'Inline math $E = mc^2$ parsed as inlinemath token');
    assert(mathToken?.content === 'E = mc^2', 'Math token content extracted cleanly without delimiters');

    const escapedTokens = parseInlineMarkdown('The price is \\$100 total.');
    const hasEscaped = escapedTokens.some((t) => t.type === 'text' && t.content === '$');
    assert(hasEscaped, 'Escaped dollar \\$ parsed as text $');

    const currencyTokens = parseInlineMarkdown('Costs $100 or $200.');
    const currencyMath = currencyTokens.filter((t) => t.type === 'inlinemath');
    assert(currencyMath.length === 0, 'Plain currency $100 or $200 not misidentified as inlinemath');
  } catch (err: any) {
    failed++;
    errors.push(`Inline tokenizer math throw: ${err.message}`);
  }

  // 5. Transclusion with Math Content
  try {
    const vIndex = buildVaultIndex([
      {
        id: 'math-note',
        title: 'Physics Equations',
        content: '# Mechanics\n$$\nF = ma\n$$\n\nInline kinetic energy: $K = \\frac{1}{2}mv^2$',
        tags: [],
        color: 'default',
        pinned: false,
        archived: false,
        trashed: false,
        createdAt: '2026-01-01',
        updatedAt: '2026-01-01',
        folderId: null,
        type: 'text',
        checklist: [],
        reminderDate: null,
        images: [],
      },
    ]);

    const res = resolveTransclusion('Physics Equations#Mechanics', 'source-note', vIndex);
    assert(res.status === 'resolved', 'Transclusion of note section with math succeeds');
    assert(res.content.includes('F = ma'), 'Transclusion retains block math formula source');
    assert(res.content.includes('K = \\frac{1}{2}mv^2'), 'Transclusion retains inline math formula source');
  } catch (err: any) {
    failed++;
    errors.push(`Transclusion math throw: ${err.message}`);
  }

  return { passed, failed, errors };
}

