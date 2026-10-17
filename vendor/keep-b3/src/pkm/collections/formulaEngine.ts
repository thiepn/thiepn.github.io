/**
 * Safe Deterministic Formula Engine for Phase P43
 * 
 * Strict Security & Correctness:
 * - NO eval()
 * - NO new Function()
 * - NO access to window, globalThis, fetch, prototype, or network
 * - Pure deterministic AST tokenizer, parser, and evaluator
 * - Cycle detection and bounded execution depth
 */

import { formatDateOnly, isDateOnlyString } from '../properties/frontmatterEngine';

export type ASTNodeType =
  | 'Literal'
  | 'PropertyRef'
  | 'UnaryOp'
  | 'BinaryOp'
  | 'FunctionCall'
  | 'Conditional';

export interface ASTNode {
  type: ASTNodeType;
  value?: any; // For Literal (number, string, boolean, null)
  name?: string; // For PropertyRef or FunctionCall
  operator?: string; // For UnaryOp or BinaryOp
  left?: ASTNode;
  right?: ASTNode;
  argument?: ASTNode; // For UnaryOp
  args?: ASTNode[]; // For FunctionCall
  condition?: ASTNode; // For Conditional
  consequent?: ASTNode; // For Conditional
  alternate?: ASTNode; // For Conditional
}

export interface FormulaEvaluationResult {
  value: any;
  type: 'number' | 'text' | 'boolean' | 'date' | 'null';
  error?: string;
}

export interface FormulaDependencyInfo {
  properties: string[];
  functions: string[];
  hasTemporalToday: boolean;
  isValid: boolean;
  errorMessage?: string;
}

// Tokenizer types
type TokenType =
  | 'NUMBER'
  | 'STRING'
  | 'IDENTIFIER'
  | 'OPERATOR'
  | 'PUNCTUATION'
  | 'KEYWORD'
  | 'EOF';

interface Token {
  type: TokenType;
  value: string;
  pos: number;
}

const KEYWORDS = new Set(['true', 'false', 'null', 'and', 'or', 'not', 'if']);

/**
 * Tokenizes formula expression
 */
function tokenize(input: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  const len = input.length;

  while (i < len) {
    const char = input[i];

    // Skip whitespace
    if (/\s/.test(char)) {
      i++;
      continue;
    }

    // Number literal
    if (/[0-9]/.test(char) || (char === '.' && i + 1 < len && /[0-9]/.test(input[i + 1]))) {
      const start = i;
      let hasDot = char === '.';
      i++;
      while (i < len) {
        const c = input[i];
        if (/[0-9]/.test(c)) {
          i++;
        } else if (c === '.' && !hasDot) {
          hasDot = true;
          i++;
        } else {
          break;
        }
      }
      tokens.push({ type: 'NUMBER', value: input.slice(start, i), pos: start });
      continue;
    }

    // String literal ("..." or '...')
    if (char === '"' || char === "'") {
      const quote = char;
      const start = i;
      i++;
      let str = '';
      let escaped = false;
      while (i < len) {
        const c = input[i];
        if (escaped) {
          str += c;
          escaped = false;
          i++;
        } else if (c === '\\') {
          escaped = true;
          i++;
        } else if (c === quote) {
          i++;
          break;
        } else {
          str += c;
          i++;
        }
      }
      tokens.push({ type: 'STRING', value: str, pos: start });
      continue;
    }

    // Two-character operators
    const twoChars = input.slice(i, i + 2);
    if (['==', '!=', '<=', '>=', '&&', '||'].includes(twoChars)) {
      tokens.push({ type: 'OPERATOR', value: twoChars, pos: i });
      i += 2;
      continue;
    }

    // Single-character operators
    if (['+', '-', '*', '/', '%', '^', '=', '<', '>', '!'].includes(char)) {
      tokens.push({ type: 'OPERATOR', value: char, pos: i });
      i++;
      continue;
    }

    // Punctuation
    if (['(', ')', ',', ':', '?'].includes(char)) {
      tokens.push({ type: 'PUNCTUATION', value: char, pos: i });
      i++;
      continue;
    }

    // Identifiers & Keywords
    if (/[a-zA-Z_$]/.test(char)) {
      const start = i;
      i++;
      while (i < len && /[a-zA-Z0-9_$-]/.test(input[i])) {
        i++;
      }
      const val = input.slice(start, i);
      const lower = val.toLowerCase();
      if (KEYWORDS.has(lower)) {
        tokens.push({ type: 'KEYWORD', value: lower, pos: start });
      } else {
        tokens.push({ type: 'IDENTIFIER', value: val, pos: start });
      }
      continue;
    }

    throw new Error(`Unexpected character '${char}' at position ${i}`);
  }

  tokens.push({ type: 'EOF', value: '', pos: i });
  return tokens;
}

/**
 * Parser for Token Stream
 */
class FormulaParser {
  private tokens: Token[];
  private current = 0;

  constructor(tokens: Token[]) {
    this.tokens = tokens;
  }

  public parse(): ASTNode {
    if (this.peek().type === 'EOF') {
      return { type: 'Literal', value: null };
    }
    const node = this.parseExpression();
    if (this.peek().type !== 'EOF') {
      throw new Error(`Unexpected token '${this.peek().value}' at position ${this.peek().pos}`);
    }
    return node;
  }

  private peek(): Token {
    return this.tokens[this.current] || { type: 'EOF', value: '', pos: -1 };
  }

  private advance(): Token {
    const token = this.peek();
    if (this.current < this.tokens.length - 1) {
      this.current++;
    }
    return token;
  }

  private match(type: TokenType, val?: string): boolean {
    const tok = this.peek();
    if (tok.type === type && (val === undefined || tok.value === val)) {
      this.advance();
      return true;
    }
    return false;
  }

  private expect(type: TokenType, val?: string, errMsg?: string): Token {
    const tok = this.peek();
    if (tok.type === type && (val === undefined || tok.value === val)) {
      return this.advance();
    }
    throw new Error(errMsg || `Expected '${val || type}' at position ${tok.pos}, found '${tok.value}'`);
  }

  // Expression precedence hierarchy
  private parseExpression(): ASTNode {
    return this.parseLogicalOr();
  }

  private parseLogicalOr(): ASTNode {
    let left = this.parseLogicalAnd();
    while (this.match('KEYWORD', 'or') || this.match('OPERATOR', '||')) {
      const right = this.parseLogicalAnd();
      left = { type: 'BinaryOp', operator: 'or', left, right };
    }
    return left;
  }

  private parseLogicalAnd(): ASTNode {
    let left = this.parseEquality();
    while (this.match('KEYWORD', 'and') || this.match('OPERATOR', '&&')) {
      const right = this.parseEquality();
      left = { type: 'BinaryOp', operator: 'and', left, right };
    }
    return left;
  }

  private parseEquality(): ASTNode {
    let left = this.parseRelational();
    while (true) {
      if (this.match('OPERATOR', '==') || this.match('OPERATOR', '=')) {
        const right = this.parseRelational();
        left = { type: 'BinaryOp', operator: '==', left, right };
      } else if (this.match('OPERATOR', '!=')) {
        const right = this.parseRelational();
        left = { type: 'BinaryOp', operator: '!=', left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseRelational(): ASTNode {
    let left = this.parseAdditive();
    while (true) {
      if (this.match('OPERATOR', '<=')) {
        const right = this.parseAdditive();
        left = { type: 'BinaryOp', operator: '<=', left, right };
      } else if (this.match('OPERATOR', '>=')) {
        const right = this.parseAdditive();
        left = { type: 'BinaryOp', operator: '>=', left, right };
      } else if (this.match('OPERATOR', '<')) {
        const right = this.parseAdditive();
        left = { type: 'BinaryOp', operator: '<', left, right };
      } else if (this.match('OPERATOR', '>')) {
        const right = this.parseAdditive();
        left = { type: 'BinaryOp', operator: '>', left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseAdditive(): ASTNode {
    let left = this.parseMultiplicative();
    while (true) {
      if (this.match('OPERATOR', '+')) {
        const right = this.parseMultiplicative();
        left = { type: 'BinaryOp', operator: '+', left, right };
      } else if (this.match('OPERATOR', '-')) {
        const right = this.parseMultiplicative();
        left = { type: 'BinaryOp', operator: '-', left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseMultiplicative(): ASTNode {
    let left = this.parseUnary();
    while (true) {
      if (this.match('OPERATOR', '*')) {
        const right = this.parseUnary();
        left = { type: 'BinaryOp', operator: '*', left, right };
      } else if (this.match('OPERATOR', '/')) {
        const right = this.parseUnary();
        left = { type: 'BinaryOp', operator: '/', left, right };
      } else if (this.match('OPERATOR', '%')) {
        const right = this.parseUnary();
        left = { type: 'BinaryOp', operator: '%', left, right };
      } else if (this.match('OPERATOR', '^')) {
        const right = this.parseUnary();
        left = { type: 'BinaryOp', operator: '^', left, right };
      } else {
        break;
      }
    }
    return left;
  }

  private parseUnary(): ASTNode {
    if (this.match('OPERATOR', '-') || this.match('OPERATOR', '+')) {
      const op = this.tokens[this.current - 1].value;
      const arg = this.parseUnary();
      return { type: 'UnaryOp', operator: op, argument: arg };
    }
    if (this.match('KEYWORD', 'not') || this.match('OPERATOR', '!')) {
      const arg = this.parseUnary();
      return { type: 'UnaryOp', operator: 'not', argument: arg };
    }
    return this.parsePrimary();
  }

  private parsePrimary(): ASTNode {
    const token = this.peek();

    // Number literal
    if (this.match('NUMBER')) {
      const num = Number(token.value);
      return { type: 'Literal', value: num };
    }

    // String literal
    if (this.match('STRING')) {
      return { type: 'Literal', value: token.value };
    }

    // Keywords (true, false, null, if)
    if (token.type === 'KEYWORD') {
      if (token.value === 'true') {
        this.advance();
        return { type: 'Literal', value: true };
      }
      if (token.value === 'false') {
        this.advance();
        return { type: 'Literal', value: false };
      }
      if (token.value === 'null') {
        this.advance();
        return { type: 'Literal', value: null };
      }
      if (token.value === 'if') {
        this.advance();
        this.expect('PUNCTUATION', '(', "Expected '(' after 'if'");
        const condition = this.parseExpression();
        this.expect('PUNCTUATION', ',', "Expected ',' after if condition");
        const consequent = this.parseExpression();
        let alternate: ASTNode = { type: 'Literal', value: null };
        if (this.match('PUNCTUATION', ',')) {
          alternate = this.parseExpression();
        }
        this.expect('PUNCTUATION', ')', "Expected ')' closing if statement");
        return { type: 'Conditional', condition, consequent, alternate };
      }
    }

    // Grouping `( expr )`
    if (this.match('PUNCTUATION', '(')) {
      const expr = this.parseExpression();
      this.expect('PUNCTUATION', ')', "Expected ')' to close grouped expression");
      return expr;
    }

    // Identifiers: either `prop("name")`, `func(a, b)`, or `property_name`
    if (this.match('IDENTIFIER')) {
      const name = token.value;

      // Check if it's a function call `func(...)`
      if (this.match('PUNCTUATION', '(')) {
        const args: ASTNode[] = [];
        if (!this.match('PUNCTUATION', ')')) {
          do {
            args.push(this.parseExpression());
          } while (this.match('PUNCTUATION', ','));
          this.expect('PUNCTUATION', ')', `Expected ')' after function '${name}' arguments`);
        }

        // Handle `prop("propertyName")` specially
        if (name.toLowerCase() === 'prop') {
          if (args.length !== 1 || args[0].type !== 'Literal' || typeof args[0].value !== 'string') {
            throw new Error(`prop() requires exactly one string literal property name argument`);
          }
          return { type: 'PropertyRef', name: args[0].value };
        }

        return { type: 'FunctionCall', name: name.toLowerCase(), args };
      }

      // Standalone identifier treated as direct property reference
      return { type: 'PropertyRef', name };
    }

    throw new Error(`Unexpected token '${token.value || token.type}' at position ${token.pos}`);
  }
}

/**
 * Parses formula string into AST with detailed error reporting
 */
export function parseFormula(expression: string): { ast: ASTNode | null; error?: string } {
  if (!expression || !expression.trim()) {
    return { ast: { type: 'Literal', value: null } };
  }
  try {
    const tokens = tokenize(expression.trim());
    const parser = new FormulaParser(tokens);
    const ast = parser.parse();
    return { ast };
  } catch (err: any) {
    return { ast: null, error: err.message || 'Formula parsing error' };
  }
}

/**
 * Inspects formula dependencies and verifies safety
 */
export function inspectFormulaDependencies(expression: string): FormulaDependencyInfo {
  const properties = new Set<string>();
  const functions = new Set<string>();
  let hasToday = false;

  const { ast, error } = parseFormula(expression);
  if (error || !ast) {
    return {
      properties: [],
      functions: [],
      hasTemporalToday: false,
      isValid: false,
      errorMessage: error,
    };
  }

  function traverse(node: ASTNode) {
    if (!node) return;
    if (node.type === 'PropertyRef' && node.name) {
      properties.add(node.name);
    }
    if (node.type === 'FunctionCall' && node.name) {
      functions.add(node.name);
      if (node.name === 'today') {
        hasToday = true;
      }
      if (node.args) {
        node.args.forEach(traverse);
      }
    }
    if (node.left) traverse(node.left);
    if (node.right) traverse(node.right);
    if (node.argument) traverse(node.argument);
    if (node.condition) traverse(node.condition);
    if (node.consequent) traverse(node.consequent);
    if (node.alternate) traverse(node.alternate);
  }

  traverse(ast);

  return {
    properties: Array.from(properties),
    functions: Array.from(functions),
    hasTemporalToday: hasToday,
    isValid: true,
  };
}

/**
 * Evaluator Context
 */
export interface FormulaContext {
  properties: Record<string, any>;
  derivedFormulas?: Record<string, any>; // other computed formulas in the record
  systemValues?: {
    createdAt?: string;
    updatedAt?: string;
    wordCount?: number;
    taskCount?: number;
    openTaskCount?: number;
    backlinkCount?: number;
  };
  now?: Date;
}

/**
 * Evaluates an AST Node safely and deterministically
 */
function evaluateNode(node: ASTNode, context: FormulaContext, depth: number = 0): any {
  if (depth > 20) {
    throw new Error('Maximum formula evaluation depth exceeded');
  }

  if (!node) return null;

  switch (node.type) {
    case 'Literal':
      return node.value;

    case 'PropertyRef': {
      const key = node.name || '';
      // 1. Check direct properties
      if (Object.prototype.hasOwnProperty.call(context.properties, key)) {
        const val = context.properties[key];
        return val !== undefined ? val : null;
      }
      // 2. Case-insensitive property lookup
      const lowerKey = key.toLowerCase();
      for (const [propKey, propVal] of Object.entries(context.properties)) {
        if (propKey.toLowerCase() === lowerKey) {
          return propVal !== undefined ? propVal : null;
        }
      }
      // 3. Check derived formulas
      if (context.derivedFormulas && Object.prototype.hasOwnProperty.call(context.derivedFormulas, key)) {
        return context.derivedFormulas[key];
      }
      // 4. Check system values
      if (context.systemValues) {
        if (key === 'createdAt' || key === 'created') return context.systemValues.createdAt || null;
        if (key === 'updatedAt' || key === 'updated') return context.systemValues.updatedAt || null;
        if (key === 'wordCount') return context.systemValues.wordCount || 0;
        if (key === 'taskCount') return context.systemValues.taskCount || 0;
        if (key === 'openTaskCount') return context.systemValues.openTaskCount || 0;
        if (key === 'backlinkCount') return context.systemValues.backlinkCount || 0;
      }
      return null;
    }

    case 'UnaryOp': {
      const arg = evaluateNode(node.argument!, context, depth + 1);
      if (node.operator === '-') {
        if (arg === null || arg === undefined || isNaN(Number(arg))) return null;
        return -Number(arg);
      }
      if (node.operator === '+') {
        if (arg === null || arg === undefined || isNaN(Number(arg))) return null;
        return Number(arg);
      }
      if (node.operator === 'not' || node.operator === '!') {
        return !Boolean(arg);
      }
      return null;
    }

    case 'BinaryOp': {
      const leftVal = evaluateNode(node.left!, context, depth + 1);
      const rightVal = evaluateNode(node.right!, context, depth + 1);

      switch (node.operator) {
        case '+': {
          // String concatenation if either is a string
          if (typeof leftVal === 'string' || typeof rightVal === 'string') {
            const strLeft = leftVal !== null && leftVal !== undefined ? String(leftVal) : '';
            const strRight = rightVal !== null && rightVal !== undefined ? String(rightVal) : '';
            return strLeft + strRight;
          }
          if (leftVal === null || rightVal === null) return null;
          const n1 = Number(leftVal);
          const n2 = Number(rightVal);
          if (isNaN(n1) || isNaN(n2)) return null;
          return n1 + n2;
        }

        case '-': {
          if (leftVal === null || rightVal === null) return null;
          const n1 = Number(leftVal);
          const n2 = Number(rightVal);
          if (isNaN(n1) || isNaN(n2)) return null;
          return n1 - n2;
        }

        case '*': {
          if (leftVal === null || rightVal === null) return null;
          const n1 = Number(leftVal);
          const n2 = Number(rightVal);
          if (isNaN(n1) || isNaN(n2)) return null;
          return n1 * n2;
        }

        case '/': {
          if (leftVal === null || rightVal === null) return null;
          const n1 = Number(leftVal);
          const n2 = Number(rightVal);
          if (isNaN(n1) || isNaN(n2)) return null;
          if (n2 === 0) return null; // Safe zero division -> null
          return n1 / n2;
        }

        case '%': {
          if (leftVal === null || rightVal === null) return null;
          const n1 = Number(leftVal);
          const n2 = Number(rightVal);
          if (isNaN(n1) || isNaN(n2) || n2 === 0) return null;
          return n1 % n2;
        }

        case '^': {
          if (leftVal === null || rightVal === null) return null;
          const n1 = Number(leftVal);
          const n2 = Number(rightVal);
          if (isNaN(n1) || isNaN(n2)) return null;
          return Math.pow(n1, n2);
        }

        case '==':
        case '=':
          return leftVal === rightVal;

        case '!=':
          return leftVal !== rightVal;

        case '<':
          if (leftVal === null || rightVal === null) return false;
          return leftVal < rightVal;

        case '<=':
          if (leftVal === null || rightVal === null) return false;
          return leftVal <= rightVal;

        case '>':
          if (leftVal === null || rightVal === null) return false;
          return leftVal > rightVal;

        case '>=':
          if (leftVal === null || rightVal === null) return false;
          return leftVal >= rightVal;

        case 'and':
        case '&&':
          return Boolean(leftVal) && Boolean(rightVal);

        case 'or':
        case '||':
          return Boolean(leftVal) || Boolean(rightVal);

        default:
          return null;
      }
    }

    case 'Conditional': {
      const cond = evaluateNode(node.condition!, context, depth + 1);
      if (Boolean(cond)) {
        return evaluateNode(node.consequent!, context, depth + 1);
      } else {
        return evaluateNode(node.alternate!, context, depth + 1);
      }
    }

    case 'FunctionCall': {
      const fn = node.name || '';
      const evaluatedArgs = (node.args || []).map((a) => evaluateNode(a, context, depth + 1));
      return executeSafeFunction(fn, evaluatedArgs, context);
    }

    default:
      return null;
  }
}

/**
 * Safe Function Execution Registry
 */
function executeSafeFunction(fn: string, args: any[], context: FormulaContext): any {
  switch (fn) {
    // Numeric functions
    case 'abs': {
      if (args[0] === null || args[0] === undefined) return null;
      const n = Number(args[0]);
      return isNaN(n) ? null : Math.abs(n);
    }

    case 'round': {
      if (args[0] === null || args[0] === undefined) return null;
      const n = Number(args[0]);
      if (isNaN(n)) return null;
      const precision = args[1] !== undefined ? Number(args[1]) : 0;
      if (isNaN(precision) || precision <= 0) return Math.round(n);
      const factor = Math.pow(10, Math.min(precision, 6));
      return Math.round(n * factor) / factor;
    }

    case 'floor': {
      if (args[0] === null || args[0] === undefined) return null;
      const n = Number(args[0]);
      return isNaN(n) ? null : Math.floor(n);
    }

    case 'ceil': {
      if (args[0] === null || args[0] === undefined) return null;
      const n = Number(args[0]);
      return isNaN(n) ? null : Math.ceil(n);
    }

    case 'min': {
      const valid = args.filter((a) => a !== null && a !== undefined && !isNaN(Number(a))).map(Number);
      return valid.length > 0 ? Math.min(...valid) : null;
    }

    case 'max': {
      const valid = args.filter((a) => a !== null && a !== undefined && !isNaN(Number(a))).map(Number);
      return valid.length > 0 ? Math.max(...valid) : null;
    }

    case 'sqrt': {
      if (args[0] === null || args[0] === undefined) return null;
      const n = Number(args[0]);
      return isNaN(n) || n < 0 ? null : Math.sqrt(n);
    }

    // Text functions
    case 'concat': {
      return args.map((a) => (a !== null && a !== undefined ? String(a) : '')).join('');
    }

    case 'length': {
      if (args[0] === null || args[0] === undefined) return 0;
      if (Array.isArray(args[0])) return args[0].length;
      return String(args[0]).length;
    }

    case 'lower': {
      if (args[0] === null || args[0] === undefined) return '';
      return String(args[0]).toLowerCase();
    }

    case 'upper': {
      if (args[0] === null || args[0] === undefined) return '';
      return String(args[0]).toUpperCase();
    }

    case 'trim': {
      if (args[0] === null || args[0] === undefined) return '';
      return String(args[0]).trim();
    }

    case 'contains': {
      if (args[0] === null || args[1] === null) return false;
      const haystack = String(args[0]).toLowerCase();
      const needle = String(args[1]).toLowerCase();
      return haystack.includes(needle);
    }

    case 'replace': {
      if (args[0] === null) return '';
      const text = String(args[0]);
      const target = String(args[1] ?? '');
      const replacement = String(args[2] ?? '');
      return text.replaceAll(target, replacement);
    }

    case 'substring': {
      if (args[0] === null) return '';
      const text = String(args[0]);
      const start = Number(args[1]) || 0;
      const end = args[2] !== undefined ? Number(args[2]) : undefined;
      return text.substring(start, end);
    }

    // Logic & Null handling
    case 'if': {
      const cond = args[0];
      return Boolean(cond) ? args[1] : (args[2] !== undefined ? args[2] : null);
    }

    case 'coalesce': {
      for (const a of args) {
        if (a !== null && a !== undefined && a !== '') return a;
      }
      return null;
    }

    case 'isempty':
    case 'empty': {
      const val = args[0];
      if (val === null || val === undefined || val === '') return true;
      if (Array.isArray(val) && val.length === 0) return true;
      return false;
    }

    case 'isnotempty': {
      const val = args[0];
      if (val === null || val === undefined || val === '') return false;
      if (Array.isArray(val) && val.length === 0) return false;
      return true;
    }

    // Date functions
    case 'today': {
      const now = context.now || new Date();
      return formatDateOnly(now);
    }

    case 'daysbetween': {
      const d1Str = formatDateOnly(args[0]);
      const d2Str = formatDateOnly(args[1]);
      if (!d1Str || !d2Str) return null;
      const t1 = new Date(`${d1Str}T00:00:00Z`).getTime();
      const t2 = new Date(`${d2Str}T00:00:00Z`).getTime();
      if (isNaN(t1) || isNaN(t2)) return null;
      const diffMs = t2 - t1;
      return Math.round(diffMs / (1000 * 60 * 60 * 24));
    }

    case 'adddays': {
      const dStr = formatDateOnly(args[0]);
      const days = Number(args[1]);
      if (!dStr || isNaN(days)) return null;
      const dt = new Date(`${dStr}T00:00:00Z`);
      if (isNaN(dt.getTime())) return null;
      dt.setUTCDate(dt.getUTCDate() + days);
      return formatDateOnly(dt);
    }

    case 'year': {
      const dStr = formatDateOnly(args[0]);
      if (!dStr) return null;
      const dt = new Date(`${dStr}T00:00:00Z`);
      return isNaN(dt.getTime()) ? null : dt.getUTCFullYear();
    }

    case 'month': {
      const dStr = formatDateOnly(args[0]);
      if (!dStr) return null;
      const dt = new Date(`${dStr}T00:00:00Z`);
      return isNaN(dt.getTime()) ? null : dt.getUTCMonth() + 1;
    }

    case 'day': {
      const dStr = formatDateOnly(args[0]);
      if (!dStr) return null;
      const dt = new Date(`${dStr}T00:00:00Z`);
      return isNaN(dt.getTime()) ? null : dt.getUTCDate();
    }

    default:
      throw new Error(`Unknown formula function '${fn}'`);
  }
}

/**
 * Top-level evaluate formula function
 */
export function evaluateFormula(expression: string, context: FormulaContext): FormulaEvaluationResult {
  const { ast, error } = parseFormula(expression);
  if (error || !ast) {
    return { value: null, type: 'null', error: error || 'Syntax error' };
  }

  try {
    const rawVal = evaluateNode(ast, context, 0);

    if (rawVal === null || rawVal === undefined) {
      return { value: null, type: 'null' };
    }

    if (typeof rawVal === 'number') {
      if (isNaN(rawVal) || !isFinite(rawVal)) {
        return { value: null, type: 'null', error: 'Calculation resulted in NaN or Infinity' };
      }
      return { value: rawVal, type: 'number' };
    }

    if (typeof rawVal === 'boolean') {
      return { value: rawVal, type: 'boolean' };
    }

    if (typeof rawVal === 'string') {
      if (isDateOnlyString(rawVal)) {
        return { value: rawVal, type: 'date' };
      }
      return { value: rawVal, type: 'text' };
    }

    return { value: String(rawVal), type: 'text' };
  } catch (err: any) {
    return { value: null, type: 'null', error: err.message || 'Evaluation error' };
  }
}

/**
 * Resolves a Dependency DAG and evaluates formulas in topological order
 * Detects cyclic dependencies and sets an explicit error on cycles.
 */
export function evaluateAllFormulas(
  formulaDefinitions: Array<{ id: string; expression: string }>,
  context: FormulaContext
): Record<string, FormulaEvaluationResult> {
  const results: Record<string, FormulaEvaluationResult> = {};
  const graph: Map<string, string[]> = new Map();
  const defMap = new Map(formulaDefinitions.map((d) => [d.id, d.expression]));

  // Build dependency map
  for (const def of formulaDefinitions) {
    const deps = inspectFormulaDependencies(def.expression);
    if (!deps.isValid) {
      results[def.id] = { value: null, type: 'null', error: deps.errorMessage || 'Invalid formula' };
    } else {
      // Filter dependencies to other formulas
      const formulaDeps = deps.properties.filter((p) => defMap.has(p));
      graph.set(def.id, formulaDeps);
    }
  }

  // Detect cycles using Tarjan/DFS
  const visited = new Set<string>();
  const inStack = new Set<string>();
  const cyclic = new Set<string>();

  function detectCycle(node: string) {
    visited.add(node);
    inStack.add(node);

    const neighbors = graph.get(node) || [];
    for (const neighbor of neighbors) {
      if (!visited.has(neighbor)) {
        detectCycle(neighbor);
      } else if (inStack.has(neighbor)) {
        cyclic.add(node);
        cyclic.add(neighbor);
      }
    }

    inStack.delete(node);
  }

  for (const def of formulaDefinitions) {
    if (!visited.has(def.id)) {
      detectCycle(def.id);
    }
  }

  for (const c of cyclic) {
    results[c] = { value: null, type: 'null', error: 'Circular dependency detected' };
  }

  // Topological evaluate
  const computedValues: Record<string, any> = {};
  const evaluatedSet = new Set<string>();

  function evaluateWithDeps(id: string, path: Set<string>) {
    if (results[id]) return; // already has error
    if (evaluatedSet.has(id)) return;
    if (path.has(id)) {
      results[id] = { value: null, type: 'null', error: 'Circular dependency in evaluation' };
      return;
    }

    path.add(id);
    const deps = graph.get(id) || [];
    for (const d of deps) {
      evaluateWithDeps(d, path);
    }
    path.delete(id);

    const expr = defMap.get(id);
    if (expr) {
      const res = evaluateFormula(expr, {
        ...context,
        derivedFormulas: computedValues,
      });
      results[id] = res;
      computedValues[id] = res.value;
    }
    evaluatedSet.add(id);
  }

  for (const def of formulaDefinitions) {
    if (!results[def.id]) {
      evaluateWithDeps(def.id, new Set());
    }
  }

  return results;
}
