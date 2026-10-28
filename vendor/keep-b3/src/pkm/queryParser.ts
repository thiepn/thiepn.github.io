import {
  QueryAST,
  QueryClause,
  QueryFieldKey,
  QueryModifiers,
  QuerySortField,
  QuerySortOrder,
  SmartQueryViewMode,
  DateComparison,
  ParseQueryResult,
  QuerySyntaxError,
} from './queryTypes';

const VALID_FIELD_KEYS: Set<QueryFieldKey> = new Set([
  'folder',
  'tag',
  'title',
  'status',
  'priority',
  'created',
  'updated',
  'has',
  'text',
  'type',
  'color',
  'is',
]);

const VALID_MODIFIERS = new Set(['sort', 'order', 'limit', 'view']);

const VALID_SORT_FIELDS: Set<QuerySortField> = new Set([
  'title',
  'updated',
  'created',
  'priority',
  'status',
  'links',
  'backlinks',
  'folder',
  'checklist',
]);

const VALID_VIEWS: Set<SmartQueryViewMode> = new Set(['list', 'table', 'cards']);

export interface Token {
  type:
    | 'AND'
    | 'OR'
    | 'NOT'
    | 'LPAREN'
    | 'RPAREN'
    | 'FIELD'
    | 'MODIFIER'
    | 'TEXT'
    | 'EOF';
  value: string;
  fieldKey?: string;
  fieldValue?: string;
  isNegated?: boolean;
  offset: number;
  length: number;
  line: number;
  column: number;
}

/**
 * Tokenizes a query string into a sequence of structured tokens with line/col tracking
 */
export function tokenizeQuery(query: string): { tokens: Token[]; error: QuerySyntaxError | null } {
  const tokens: Token[] = [];
  let i = 0;
  let line = 1;
  let lineStartOffset = 0;

  function getCol(offset: number) {
    return offset - lineStartOffset + 1;
  }

  while (i < query.length) {
    const ch = query[i];

    // Handle newlines
    if (ch === '\n') {
      line++;
      lineStartOffset = i + 1;
      i++;
      continue;
    }

    // Skip whitespace
    if (/\s/.test(ch)) {
      i++;
      continue;
    }

    const startOffset = i;
    const startCol = getCol(i);

    // Parentheses
    if (ch === '(') {
      tokens.push({
        type: 'LPAREN',
        value: '(',
        offset: startOffset,
        length: 1,
        line,
        column: startCol,
      });
      i++;
      continue;
    }
    if (ch === ')') {
      tokens.push({
        type: 'RPAREN',
        value: ')',
        offset: startOffset,
        length: 1,
        line,
        column: startCol,
      });
      i++;
      continue;
    }

    // Check for negation prefix: -field:val or -val or -"phrase"
    let isNegated = false;
    let scanIdx = i;
    if (ch === '-' && i + 1 < query.length && !/\s/.test(query[i + 1])) {
      isNegated = true;
      scanIdx = i + 1;
    }

    // Read full word or quoted phrase
    let word = '';
    let hasQuote = false;
    let quoteChar: string | null = null;

    if (query[scanIdx] === '"' || query[scanIdx] === "'") {
      hasQuote = true;
      quoteChar = query[scanIdx];
      scanIdx++;
      const quoteStart = scanIdx;
      while (scanIdx < query.length) {
        if (query[scanIdx] === '\\' && scanIdx + 1 < query.length) {
          word += query[scanIdx + 1];
          scanIdx += 2;
          continue;
        }
        if (query[scanIdx] === quoteChar) {
          break;
        }
        word += query[scanIdx];
        scanIdx++;
      }

      if (scanIdx >= query.length) {
        return {
          tokens: [],
          error: {
            message: `Unclosed quote ${quoteChar} starting at position ${quoteStart}`,
            line,
            column: getCol(quoteStart - 1),
            offset: quoteStart - 1,
            suggestion: `Add a closing ${quoteChar} at the end of the phrase.`,
          },
        };
      }
      scanIdx++; // consume closing quote
    } else {
      // Check if it is a field with a quoted value, e.g. folder:"Work Projects"
      let prefix = '';
      let tempIdx = scanIdx;
      while (tempIdx < query.length && /[a-zA-Z0-9_-]/.test(query[tempIdx])) {
        prefix += query[tempIdx];
        tempIdx++;
      }
      if (
        prefix.length > 0 &&
        tempIdx < query.length &&
        query[tempIdx] === ':' &&
        tempIdx + 1 < query.length &&
        (query[tempIdx + 1] === '"' || query[tempIdx + 1] === "'")
      ) {
        scanIdx = tempIdx + 1; // at quote
        quoteChar = query[scanIdx];
        scanIdx++; // consume quote
        const quoteStart = scanIdx;
        let quotedVal = '';
        while (scanIdx < query.length) {
          if (query[scanIdx] === '\\' && scanIdx + 1 < query.length) {
            quotedVal += query[scanIdx + 1];
            scanIdx += 2;
            continue;
          }
          if (query[scanIdx] === quoteChar) {
            break;
          }
          quotedVal += query[scanIdx];
          scanIdx++;
        }
        if (scanIdx >= query.length) {
          return {
            tokens: [],
            error: {
              message: `Unclosed quote ${quoteChar} starting at position ${quoteStart}`,
              line,
              column: getCol(quoteStart - 1),
              offset: quoteStart - 1,
              suggestion: `Add a closing ${quoteChar} at the end of the field value.`,
            },
          };
        }
        scanIdx++; // consume closing quote
        word = `${prefix}:${quotedVal}`;
      } else {
        // Unquoted term: read until whitespace or parenthesis
        while (
          scanIdx < query.length &&
          !/\s/.test(query[scanIdx]) &&
          query[scanIdx] !== '(' &&
          query[scanIdx] !== ')'
        ) {
          word += query[scanIdx];
          scanIdx++;
        }
      }
    }

    const totalLength = scanIdx - startOffset;
    i = scanIdx;

    // Check boolean operators (only when not negated and not quoted)
    if (!isNegated && !hasQuote) {
      const upper = word.toUpperCase();
      if (upper === 'AND') {
        tokens.push({
          type: 'AND',
          value: 'AND',
          offset: startOffset,
          length: totalLength,
          line,
          column: startCol,
        });
        continue;
      }
      if (upper === 'OR') {
        tokens.push({
          type: 'OR',
          value: 'OR',
          offset: startOffset,
          length: totalLength,
          line,
          column: startCol,
        });
        continue;
      }
      if (upper === 'NOT') {
        tokens.push({
          type: 'NOT',
          value: 'NOT',
          offset: startOffset,
          length: totalLength,
          line,
          column: startCol,
        });
        continue;
      }
    }

    // Check if it is a field or modifier: key:value or key:"quoted value"
    const colonIdx = word.indexOf(':');
    if (colonIdx > 0) {
      const key = word.slice(0, colonIdx).toLowerCase();
      let rawVal = word.slice(colonIdx + 1);

      // Value might have quotes if written like field:"some words" where tokenizer didn't start with quote
      if (
        (rawVal.startsWith('"') && rawVal.endsWith('"')) ||
        (rawVal.startsWith("'") && rawVal.endsWith("'"))
      ) {
        rawVal = rawVal.slice(1, -1);
      }

      // Strip leading hash if tag: #urgent
      if (key === 'tag' && rawVal.startsWith('#')) {
        rawVal = rawVal.replace(/^#+/, '');
      }

      // Check if it is a modifier
      if (VALID_MODIFIERS.has(key)) {
        tokens.push({
          type: 'MODIFIER',
          value: word,
          fieldKey: key,
          fieldValue: rawVal,
          offset: startOffset,
          length: totalLength,
          line,
          column: startCol,
        });
        continue;
      }

      // Check if it is a field
      if (VALID_FIELD_KEYS.has(key as QueryFieldKey)) {
        tokens.push({
          type: 'FIELD',
          value: word,
          fieldKey: key,
          fieldValue: rawVal,
          isNegated,
          offset: startOffset,
          length: totalLength,
          line,
          column: startCol,
        });
        continue;
      }

      // If user used #tag directly (e.g. #todo) or tag has prefix
      if (key.startsWith('#')) {
        tokens.push({
          type: 'FIELD',
          value: word,
          fieldKey: 'tag',
          fieldValue: key.slice(1),
          isNegated,
          offset: startOffset,
          length: totalLength,
          line,
          column: startCol,
        });
        continue;
      }

      // Field key unknown - check suggestions
      const suggestion = findClosestField(key);
      return {
        tokens: [],
        error: {
          message: `Unknown filter field '${key}:'`,
          line,
          column: startCol,
          offset: startOffset,
          token: key,
          suggestion: suggestion
            ? `Did you mean '${suggestion}:'? Supported fields: ${Array.from(VALID_FIELD_KEYS).join(', ')}`
            : `Supported fields: ${Array.from(VALID_FIELD_KEYS).join(', ')}`,
        },
      };
    }

    // Direct #tag token without colon (e.g. #project, #urgent)
    if (word.startsWith('#') && word.length > 1) {
      tokens.push({
        type: 'FIELD',
        value: word,
        fieldKey: 'tag',
        fieldValue: word.slice(1),
        isNegated,
        offset: startOffset,
        length: totalLength,
        line,
        column: startCol,
      });
      continue;
    }

    // Bare text token
    tokens.push({
      type: 'TEXT',
      value: word,
      isNegated,
      offset: startOffset,
      length: totalLength,
      line,
      column: startCol,
    });
  }

  tokens.push({
    type: 'EOF',
    value: '',
    offset: query.length,
    length: 0,
    line,
    column: getCol(query.length),
  });

  return { tokens, error: null };
}

function findClosestField(input: string): string | null {
  const fields: string[] = [...Array.from(VALID_FIELD_KEYS), ...Array.from(VALID_MODIFIERS)];
  let closest: string | null = null;
  let minDiff = 3;

  for (const f of fields) {
    const dist = levenshteinDistance(input, f);
    if (dist < minDiff) {
      minDiff = dist;
      closest = f;
    }
  }
  return closest;
}

function levenshteinDistance(a: string, b: string): number {
  const dp: number[][] = Array(a.length + 1)
    .fill(0)
    .map(() => Array(b.length + 1).fill(0));

  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1];
      } else {
        dp[i][j] = 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]);
      }
    }
  }
  return dp[a.length][b.length];
}

/**
 * Parses date specification (e.g. '>2026-01-01', '<7d', 'today', 'yesterday', 'this-week')
 */
export function parseDateComparison(rawVal: string): DateComparison | undefined {
  let operator: '>' | '<' | '>=' | '<=' | '=' = '=';
  let dateStr = rawVal.trim();

  if (dateStr.startsWith('>=')) {
    operator = '>=';
    dateStr = dateStr.slice(2).trim();
  } else if (dateStr.startsWith('<=')) {
    operator = '<=';
    dateStr = dateStr.slice(2).trim();
  } else if (dateStr.startsWith('>')) {
    operator = '>';
    dateStr = dateStr.slice(1).trim();
  } else if (dateStr.startsWith('<')) {
    operator = '<';
    dateStr = dateStr.slice(1).trim();
  } else if (dateStr.startsWith('=')) {
    operator = '=';
    dateStr = dateStr.slice(1).trim();
  }

  const now = new Date();
  const lower = dateStr.toLowerCase();

  if (lower === 'today') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    return { operator, date: d, rawSpec: rawVal };
  }
  if (lower === 'yesterday') {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
    return { operator, date: d, rawSpec: rawVal };
  }
  if (lower === 'this-week') {
    const day = now.getDay();
    const diff = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.getFullYear(), now.getMonth(), diff);
    return { operator: operator === '=' ? '>=' : operator, date: monday, rawSpec: rawVal };
  }
  if (lower === 'this-month') {
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    return { operator: operator === '=' ? '>=' : operator, date: firstDay, rawSpec: rawVal };
  }
  if (lower === 'this-year') {
    const firstJan = new Date(now.getFullYear(), 0, 1);
    return { operator: operator === '=' ? '>=' : operator, date: firstJan, rawSpec: rawVal };
  }

  // Relative offset like '7d', '24h', '30d', '2w', '1m', '1y'
  const offsetMatch = lower.match(/^(\d+)\s*([dhwmy])$/);
  if (offsetMatch) {
    const amt = parseInt(offsetMatch[1], 10);
    const unit = offsetMatch[2];
    const targetDate = new Date(now.getTime());

    if (unit === 'h') targetDate.setHours(targetDate.getHours() - amt);
    else if (unit === 'd') targetDate.setDate(targetDate.getDate() - amt);
    else if (unit === 'w') targetDate.setDate(targetDate.getDate() - amt * 7);
    else if (unit === 'm') targetDate.setMonth(targetDate.getMonth() - amt);
    else if (unit === 'y') targetDate.setFullYear(targetDate.getFullYear() - amt);

    // If no explicit operator was typed with relative offset (e.g. updated:7d), default to >= targetDate (within last X)
    const effectiveOp = operator === '=' ? '>=' : operator;
    return { operator: effectiveOp, date: targetDate, rawSpec: rawVal };
  }

  // ISO or standard date string (e.g. 2026-01-15)
  const parsedTimestamp = Date.parse(dateStr);
  if (!isNaN(parsedTimestamp)) {
    return { operator, date: new Date(parsedTimestamp), rawSpec: rawVal };
  }

  return undefined;
}

/**
 * Deterministic recursive-descent query parser
 */
export function parseSmartQuery(queryText: string): ParseQueryResult {
  const trimmed = queryText.trim();
  if (!trimmed) {
    return {
      ast: {
        rootClause: null,
        modifiers: {},
        rawQuery: queryText,
      },
      error: null,
    };
  }

  const { tokens, error: tokenError } = tokenizeQuery(trimmed);
  if (tokenError) {
    return { ast: null, error: tokenError };
  }

  let pos = 0;
  const modifiers: QueryModifiers = {};

  function peek(): Token {
    return tokens[pos] || tokens[tokens.length - 1];
  }

  function advance(): Token {
    const t = tokens[pos];
    pos++;
    return t;
  }

  // 1. First pass: extract all MODIFIER tokens
  const nonModifierTokens: Token[] = [];
  for (const tok of tokens) {
    if (tok.type === 'MODIFIER') {
      const key = tok.fieldKey;
      const val = tok.fieldValue || '';

      if (key === 'sort') {
        const sortVal = val.toLowerCase() as QuerySortField;
        if (VALID_SORT_FIELDS.has(sortVal)) {
          modifiers.sort = sortVal;
        } else {
          return {
            ast: null,
            error: {
              message: `Invalid sort field '${val}'.`,
              line: tok.line,
              column: tok.column,
              offset: tok.offset,
              suggestion: `Supported sort fields: ${Array.from(VALID_SORT_FIELDS).join(', ')}`,
            },
          };
        }
      } else if (key === 'order') {
        const orderVal = val.toLowerCase();
        if (orderVal === 'asc' || orderVal === 'desc') {
          modifiers.order = orderVal;
        } else {
          return {
            ast: null,
            error: {
              message: `Invalid order '${val}'. Must be 'asc' or 'desc'.`,
              line: tok.line,
              column: tok.column,
              offset: tok.offset,
              suggestion: `Use 'order:asc' or 'order:desc'.`,
            },
          };
        }
      } else if (key === 'limit') {
        const num = parseInt(val, 10);
        if (!isNaN(num) && num > 0) {
          modifiers.limit = Math.min(num, 500);
        } else {
          return {
            ast: null,
            error: {
              message: `Invalid limit value '${val}'. Must be a positive number.`,
              line: tok.line,
              column: tok.column,
              offset: tok.offset,
              suggestion: `Example: 'limit:10'`,
            },
          };
        }
      } else if (key === 'view') {
        const viewVal = val.toLowerCase() as SmartQueryViewMode;
        if (VALID_VIEWS.has(viewVal)) {
          modifiers.view = viewVal;
        } else {
          return {
            ast: null,
            error: {
              message: `Invalid view mode '${val}'.`,
              line: tok.line,
              column: tok.column,
              offset: tok.offset,
              suggestion: `Supported views: list, table, cards`,
            },
          };
        }
      }
    } else {
      nonModifierTokens.push(tok);
    }
  }

  // If there are no filtering clauses (e.g. only modifiers like 'sort:updated limit:10')
  if (nonModifierTokens.length === 1 && nonModifierTokens[0].type === 'EOF') {
    return {
      ast: {
        rootClause: null,
        modifiers,
        rawQuery: queryText,
      },
      error: null,
    };
  }

  // 2. Parse filtering expressions: OR -> AND -> NOT -> PRIMARY
  pos = 0;
  const filterTokens = nonModifierTokens;

  function currentTok(): Token {
    return filterTokens[pos] || filterTokens[filterTokens.length - 1];
  }

  function matchToken(type: Token['type']): boolean {
    if (currentTok().type === type) {
      pos++;
      return true;
    }
    return false;
  }

  function parseExpression(): QueryClause {
    return parseOr();
  }

  function parseOr(): QueryClause {
    const left = parseAnd();
    const clauses: QueryClause[] = [left];

    while (currentTok().type === 'OR') {
      const orTok = advance();
      if (currentTok().type === 'EOF' || currentTok().type === 'RPAREN') {
        throw {
          message: `Expected query term after 'OR'`,
          line: orTok.line,
          column: orTok.column + orTok.length,
          offset: orTok.offset + orTok.length,
          suggestion: `Provide a condition after 'OR', or remove the operator.`,
        } as QuerySyntaxError;
      }
      clauses.push(parseAnd());
    }

    if (clauses.length === 1) return clauses[0];
    return { type: 'or', clauses };
  }

  function parseAnd(): QueryClause {
    const left = parseUnary();
    const clauses: QueryClause[] = [left];

    while (
      currentTok().type !== 'EOF' &&
      currentTok().type !== 'OR' &&
      currentTok().type !== 'RPAREN'
    ) {
      // Explicit 'AND' or implicit adjacency (e.g. 'folder:Work tag:dev')
      if (currentTok().type === 'AND') {
        const andTok = advance();
        if (currentTok().type === 'EOF' || currentTok().type === 'RPAREN' || currentTok().type === 'OR') {
          throw {
            message: `Expected query term after 'AND'`,
            line: andTok.line,
            column: andTok.column + andTok.length,
            offset: andTok.offset + andTok.length,
            suggestion: `Provide a condition after 'AND', or remove the operator.`,
          } as QuerySyntaxError;
        }
      }
      clauses.push(parseUnary());
    }

    if (clauses.length === 1) return clauses[0];
    return { type: 'and', clauses };
  }

  function parseUnary(): QueryClause {
    if (currentTok().type === 'NOT') {
      const notTok = advance();
      if (currentTok().type === 'EOF' || currentTok().type === 'RPAREN' || currentTok().type === 'AND' || currentTok().type === 'OR') {
        throw {
          message: `Expected query term after 'NOT'`,
          line: notTok.line,
          column: notTok.column + notTok.length,
          offset: notTok.offset + notTok.length,
          suggestion: `Example: 'NOT tag:archived'`,
        } as QuerySyntaxError;
      }
      const clause = parsePrimary();
      return { type: 'not', clause };
    }
    return parsePrimary();
  }

  function parsePrimary(): QueryClause {
    const tok = currentTok();

    if (tok.type === 'LPAREN') {
      const lparen = advance();
      const expr = parseExpression();
      if (currentTok().type !== 'RPAREN') {
        throw {
          message: `Unclosed parenthesis '(' starting at column ${lparen.column}`,
          line: lparen.line,
          column: lparen.column,
          offset: lparen.offset,
          suggestion: `Add a closing ')' to match the open parenthesis.`,
        } as QuerySyntaxError;
      }
      advance(); // consume ')'
      return expr;
    }

    if (tok.type === 'FIELD') {
      advance();
      const field = tok.fieldKey as QueryFieldKey;
      const rawVal = tok.fieldValue || '';

      // Date comparison parsing for created/updated
      let dateComparison: DateComparison | undefined;
      if (field === 'created' || field === 'updated') {
        dateComparison = parseDateComparison(rawVal);
        if (!dateComparison) {
          throw {
            message: `Invalid date format '${rawVal}' for field '${field}:'`,
            line: tok.line,
            column: tok.column,
            offset: tok.offset,
            suggestion: `Use 'today', 'yesterday', 'this-week', '<7d', '>30d', or 'YYYY-MM-DD' (e.g. '${field}:>2026-01-01').`,
          } as QuerySyntaxError;
        }
      }

      const leaf: QueryClause = {
        type: 'field',
        field,
        value: rawVal,
        negated: tok.isNegated,
        dateComparison,
      };

      if (tok.isNegated) {
        return { type: 'not', clause: { ...leaf, negated: false } };
      }
      return leaf;
    }

    if (tok.type === 'TEXT') {
      advance();
      const leaf: QueryClause = {
        type: 'text',
        value: tok.value,
        negated: tok.isNegated,
      };
      if (tok.isNegated) {
        return { type: 'not', clause: { ...leaf, negated: false } };
      }
      return leaf;
    }

    if (tok.type === 'EOF') {
      throw {
        message: `Unexpected end of query`,
        line: tok.line,
        column: tok.column,
        offset: tok.offset,
      } as QuerySyntaxError;
    }

    throw {
      message: `Unexpected token '${tok.value}'`,
      line: tok.line,
      column: tok.column,
      offset: tok.offset,
    } as QuerySyntaxError;
  }

  try {
    const rootClause = parseExpression();
    if (pos < filterTokens.length && filterTokens[pos].type !== 'EOF') {
      const remaining = filterTokens[pos];
      return {
        ast: null,
        error: {
          message: `Unexpected token '${remaining.value}' after expression`,
          line: remaining.line,
          column: remaining.column,
          offset: remaining.offset,
        },
      };
    }

    return {
      ast: {
        rootClause,
        modifiers,
        rawQuery: queryText,
      },
      error: null,
    };
  } catch (err: unknown) {
    const syntaxErr = err as QuerySyntaxError;
    return {
      ast: null,
      error: syntaxErr,
    };
  }
}
