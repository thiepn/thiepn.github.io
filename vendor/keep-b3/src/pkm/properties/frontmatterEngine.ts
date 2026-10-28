import {
  PropertyType,
  PropertyValue,
  FrontmatterAST,
  FrontmatterLineNode,
  PropertyValidationResult,
} from './propertyTypes';

/**
 * Checks if a string is a valid, safe URL (allows http, https, mailto; rejects javascript:, data:, etc.)
 */
export function isValidSafeUrl(urlString: string): boolean {
  if (!urlString || typeof urlString !== 'string') return false;
  const trimmed = urlString.trim();
  try {
    const parsed = new URL(trimmed);
    const protocol = parsed.protocol.toLowerCase();
    return protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:';
  } catch {
    // Relative URLs or missing protocol
    if (/^(https?:\/\/|mailto:)[^\s/$.?#].[^\s]*$/i.test(trimmed)) {
      return true;
    }
    return false;
  }
}

/**
 * Formats a Date or date string to strict YYYY-MM-DD date-only without timezone shift
 */
export function formatDateOnly(input: Date | string | number): string {
  if (!input) return '';
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
      return trimmed;
    }
    const parsed = new Date(trimmed);
    if (!isNaN(parsed.getTime())) {
      const y = parsed.getUTCFullYear();
      const m = String(parsed.getUTCMonth() + 1).padStart(2, '0');
      const d = String(parsed.getUTCDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }
    return trimmed;
  }
  if (input instanceof Date && !isNaN(input.getTime())) {
    const y = input.getFullYear();
    const m = String(input.getMonth() + 1).padStart(2, '0');
    const d = String(input.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }
  return '';
}

/**
 * Checks if a string matches strict YYYY-MM-DD format
 */
export function isDateOnlyString(val: string): boolean {
  if (typeof val !== 'string') return false;
  return /^\d{4}-\d{2}-\d{2}$/.test(val.trim());
}

/**
 * Infers PropertyType from a value and optionally key name hints
 */
export function inferPropertyType(key: string, value: unknown): PropertyType {
  const normKey = key.toLowerCase().trim();

  // Known semantic keys
  if (normKey === 'tags' || normKey === 'aliases') {
    return 'multiselect';
  }
  if (normKey === 'status' || normKey === 'priority' || normKey === 'color' || normKey === 'type') {
    return 'select';
  }
  if (normKey === 'due' || normKey === 'date' || normKey === 'created' || normKey === 'updated' || normKey.endsWith('_date') || normKey.endsWith('date')) {
    if (typeof value === 'string' && isDateOnlyString(value)) {
      return 'date';
    }
  }

  if (typeof value === 'boolean') {
    return 'boolean';
  }

  if (typeof value === 'number') {
    return 'number';
  }

  if (Array.isArray(value)) {
    return 'multiselect';
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed === 'true' || trimmed === 'false') {
      return 'boolean';
    }
    if (isDateOnlyString(trimmed)) {
      return 'date';
    }
    if (isValidSafeUrl(trimmed)) {
      return 'url';
    }
    if (!isNaN(Number(trimmed)) && trimmed !== '') {
      return 'number';
    }
    return 'text';
  }

  if (value && typeof value === 'object') {
    return 'raw';
  }

  return 'text';
}

/**
 * Validates and casts an input value against an expected PropertyType
 */
export function validatePropertyValue(type: PropertyType, rawVal: unknown): PropertyValidationResult {
  if (rawVal === undefined || rawVal === null || rawVal === '') {
    return { isValid: true, value: type === 'multiselect' ? [] : (type === 'boolean' ? false : '') };
  }

  switch (type) {
    case 'boolean': {
      if (typeof rawVal === 'boolean') return { isValid: true, value: rawVal };
      const str = String(rawVal).toLowerCase().trim();
      if (str === 'true' || str === 'yes' || str === '1') return { isValid: true, value: true };
      if (str === 'false' || str === 'no' || str === '0') return { isValid: true, value: false };
      return { isValid: false, error: 'Value must be true or false' };
    }

    case 'number': {
      if (typeof rawVal === 'number' && !isNaN(rawVal)) {
        return { isValid: true, value: rawVal };
      }
      const str = String(rawVal).trim();
      const num = Number(str);
      if (!isNaN(num) && str !== '') {
        return { isValid: true, value: num };
      }
      return { isValid: false, error: 'Value must be a valid number' };
    }

    case 'date': {
      const str = String(rawVal).trim();
      if (isDateOnlyString(str)) {
        return { isValid: true, value: str };
      }
      const formatted = formatDateOnly(str);
      if (formatted && isDateOnlyString(formatted)) {
        return { isValid: true, value: formatted };
      }
      return { isValid: false, error: 'Date must match YYYY-MM-DD' };
    }

    case 'url': {
      const str = String(rawVal).trim();
      if (isValidSafeUrl(str)) {
        return { isValid: true, value: str };
      }
      return { isValid: false, error: 'Must be a valid safe URL (http/https)' };
    }

    case 'multiselect': {
      if (Array.isArray(rawVal)) {
        return { isValid: true, value: rawVal.map(String).map((s) => s.trim()).filter(Boolean) };
      }
      if (typeof rawVal === 'string') {
        const items = rawVal
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        return { isValid: true, value: items };
      }
      return { isValid: true, value: [] };
    }

    case 'select':
    case 'text': {
      return { isValid: true, value: String(rawVal) };
    }

    case 'raw': {
      return { isValid: true, value: rawVal as PropertyValue };
    }

    default:
      return { isValid: true, value: String(rawVal) };
  }
}

/**
 * Parses raw YAML text into a structured AST and property map with error detection
 */
export function parseFrontmatterAST(rawText: string): {
  ast: FrontmatterAST;
  frontmatter: Record<string, unknown>;
  body: string;
  frontmatterLineCount: number;
} {
  if (!rawText || !rawText.startsWith('---')) {
    return {
      ast: {
        hasFrontmatter: false,
        hasSyntaxError: false,
        lines: [],
        rawYaml: '',
        properties: {},
        propertyTypes: {},
        duplicateKeys: [],
      },
      frontmatter: {},
      body: rawText || '',
      frontmatterLineCount: 0,
    };
  }

  // Find closing ---
  const endMatch = rawText.slice(3).search(/\n---\s*(\n|$)/);
  if (endMatch === -1) {
    return {
      ast: {
        hasFrontmatter: true,
        hasSyntaxError: true,
        errorMessage: 'Unclosed YAML frontmatter fence (missing closing "---")',
        lines: [],
        rawYaml: rawText,
        properties: {},
        propertyTypes: {},
        duplicateKeys: [],
      },
      frontmatter: {},
      body: rawText,
      frontmatterLineCount: 0,
    };
  }

  const rawYaml = rawText.slice(3, 3 + endMatch).trim();
  const body = rawText.slice(3 + endMatch + 4).replace(/^\n/, '');
  const frontmatterLineCount = rawText.slice(0, 3 + endMatch + 4).split('\n').length - 1;

  const lines = rawYaml.split('\n');
  const astLines: FrontmatterLineNode[] = [];
  const properties: Record<string, unknown> = {};
  const propertyTypes: Record<string, PropertyType> = {};
  const seenKeys = new Set<string>();
  const duplicateKeys: string[] = [];

  let currentKey: string | null = null;
  let currentArray: string[] | null = null;
  let hasSyntaxError = false;
  let errorMessage: string | undefined;
  let errorLine: number | undefined;

  for (let idx = 0; idx < lines.length; idx++) {
    const rawLine = lines[idx];
    const trimmed = rawLine.trim();

    // 1. Empty lines
    if (!trimmed) {
      astLines.push({ type: 'empty', raw: rawLine });
      continue;
    }

    // 2. Comments
    if (trimmed.startsWith('#')) {
      astLines.push({ type: 'comment', raw: rawLine, comments: trimmed.slice(1).trim() });
      continue;
    }

    // 3. Array Item: - value
    if (trimmed.startsWith('-') && currentKey && currentArray) {
      const itemVal = trimmed.slice(1).trim().replace(/^["']|["']$/g, '');
      currentArray.push(itemVal);
      astLines.push({
        type: 'array_item',
        raw: rawLine,
        key: currentKey,
        value: itemVal,
      });
      continue;
    }

    // 4. Nested object / unexpected indentation
    const indentMatch = rawLine.match(/^(\s+)/);
    if (indentMatch && !trimmed.startsWith('-') && !trimmed.startsWith('#')) {
      // Indented line without an active key or nested object
      if (currentKey) {
        // Raw nested
        astLines.push({
          type: 'raw_nested',
          raw: rawLine,
          key: currentKey,
          indent: indentMatch[1],
        });
        continue;
      }
    }

    // 5. Key-value line: key: value
    const colonIdx = rawLine.indexOf(':');
    if (colonIdx > -1) {
      // Finalize previous array if active
      if (currentKey && currentArray) {
        properties[currentKey] = currentArray;
        propertyTypes[currentKey] = 'multiselect';
        currentKey = null;
        currentArray = null;
      }

      const keyPart = rawLine.slice(0, colonIdx).trim();
      const valPart = rawLine.slice(colonIdx + 1).trim();

      if (!keyPart) {
        hasSyntaxError = true;
        errorMessage = `Syntax error on line ${idx + 2}: Empty property key`;
        errorLine = idx + 2;
        continue;
      }

      if (seenKeys.has(keyPart)) {
        duplicateKeys.push(keyPart);
      }
      seenKeys.add(keyPart);

      if (!valPart) {
        // Multi-line list or empty key
        currentKey = keyPart;
        currentArray = [];
        astLines.push({
          type: 'array_header',
          raw: rawLine,
          key: keyPart,
        });
      } else if (valPart.startsWith('[') && valPart.endsWith(']')) {
        // Inline list: [a, b, c]
        const items = valPart
          .slice(1, -1)
          .split(',')
          .map((s) => s.trim().replace(/^["']|["']$/g, ''))
          .filter(Boolean);
        properties[keyPart] = items;
        propertyTypes[keyPart] = 'multiselect';
        astLines.push({
          type: 'kv',
          raw: rawLine,
          key: keyPart,
          value: items,
        });
      } else {
        // Scalar value
        let parsedVal: unknown = valPart.replace(/^["']|["']$/g, '');
        if (valPart === 'true') parsedVal = true;
        else if (valPart === 'false') parsedVal = false;
        else if (!isNaN(Number(valPart)) && valPart !== '' && !valPart.includes('-') && !valPart.includes(':')) {
          parsedVal = Number(valPart);
        }

        properties[keyPart] = parsedVal;
        propertyTypes[keyPart] = inferPropertyType(keyPart, parsedVal);

        astLines.push({
          type: 'kv',
          raw: rawLine,
          key: keyPart,
          value: parsedVal,
        });
      }
    } else {
      // Unrecognized syntax in frontmatter
      hasSyntaxError = true;
      errorMessage = `Syntax error on line ${idx + 2}: Invalid YAML entry "${trimmed}"`;
      errorLine = idx + 2;
      astLines.push({ type: 'raw_nested', raw: rawLine });
    }
  }

  if (currentKey && currentArray) {
    properties[currentKey] = currentArray;
    propertyTypes[currentKey] = 'multiselect';
  }

  // Normalize aliases & tags in frontmatter if string
  if (typeof properties.aliases === 'string') {
    properties.aliases = [properties.aliases];
  }
  if (typeof properties.tags === 'string') {
    properties.tags = (properties.tags as string).split(',').map((t) => t.trim().replace(/^#/, ''));
  } else if (Array.isArray(properties.tags)) {
    properties.tags = properties.tags.map((t) => String(t).trim().replace(/^#/, ''));
  }

  const ast: FrontmatterAST = {
    hasFrontmatter: true,
    hasSyntaxError,
    errorMessage,
    errorLine,
    lines: astLines,
    rawYaml,
    properties,
    propertyTypes,
    duplicateKeys,
  };

  return { ast, frontmatter: properties, body, frontmatterLineCount };
}

/**
 * Serializes a key and value to YAML string representation
 */
export function serializeYamlProperty(key: string, value: unknown, type?: PropertyType): string {
  const inferredType = type || inferPropertyType(key, value);

  if (value === null || value === undefined || value === '') {
    return `${key}: ""`;
  }

  if (inferredType === 'boolean' || typeof value === 'boolean') {
    return `${key}: ${value ? 'true' : 'false'}`;
  }

  if (inferredType === 'number' || typeof value === 'number') {
    return `${key}: ${value}`;
  }

  if (inferredType === 'date') {
    const d = formatDateOnly(String(value));
    return `${key}: ${d}`;
  }

  if (Array.isArray(value) || inferredType === 'multiselect') {
    const arr = Array.isArray(value) ? value : [value];
    if (arr.length === 0) {
      return `${key}: []`;
    }
    const lines = [`${key}:`];
    for (const item of arr) {
      const itemStr = String(item).trim();
      if (itemStr.includes(':') || itemStr.includes('#') || itemStr.includes('"')) {
        lines.push(`  - "${itemStr.replace(/"/g, '\\"')}"`);
      } else {
        lines.push(`  - ${itemStr}`);
      }
    }
    return lines.join('\n');
  }

  const strVal = String(value);
  if (strVal.includes(':') || strVal.includes('#') || strVal.includes('\n') || strVal.startsWith('[') || strVal.startsWith('{')) {
    return `${key}: "${strVal.replace(/"/g, '\\"')}"`;
  }

  return `${key}: ${strVal}`;
}

/**
 * Surgically updates or adds a property in note content while preserving existing frontmatter formatting
 */
export function setPropertyInContent(
  content: string,
  key: string,
  value: unknown,
  type?: PropertyType
): string {
  const trimmedKey = key.trim();
  if (!trimmedKey) return content;

  const { ast, body } = parseFrontmatterAST(content);

  // If there's a syntax error, do NOT blindly overwrite the frontmatter to prevent data destruction
  if (ast.hasSyntaxError) {
    console.warn(`Cannot update property "${key}" in content because frontmatter has syntax errors.`);
    return content;
  }

  const serialized = serializeYamlProperty(trimmedKey, value, type);

  if (!ast.hasFrontmatter || ast.lines.length === 0) {
    // Add new frontmatter fence
    return `---\n${serialized}\n---\n\n${content.replace(/^---\n?/, '')}`;
  }

  // Update existing frontmatter lines
  const newLines: string[] = [];
  let updated = false;
  let inTargetArray = false;

  for (let i = 0; i < ast.lines.length; i++) {
    const node = ast.lines[i];

    if (node.key === trimmedKey) {
      if (!updated) {
        newLines.push(serialized);
        updated = true;
      }
      if (node.type === 'array_header') {
        inTargetArray = true;
      }
      continue;
    }

    if (inTargetArray) {
      if (node.type === 'array_item' || node.type === 'raw_nested') {
        // Skip previous array items for this key
        continue;
      } else {
        inTargetArray = false;
      }
    }

    newLines.push(node.raw);
  }

  if (!updated) {
    newLines.push(serialized);
  }

  const newYaml = newLines.join('\n');
  return `---\n${newYaml}\n---\n\n${body}`;
}

/**
 * Surgically removes a property from note content
 */
export function removePropertyFromContent(content: string, key: string): string {
  const trimmedKey = key.trim();
  if (!trimmedKey) return content;

  const { ast, body } = parseFrontmatterAST(content);
  if (!ast.hasFrontmatter || ast.hasSyntaxError) return content;

  const newLines: string[] = [];
  let inTargetArray = false;
  let remainingPropertiesCount = 0;

  for (const node of ast.lines) {
    if (node.key === trimmedKey) {
      if (node.type === 'array_header') {
        inTargetArray = true;
      }
      continue;
    }

    if (inTargetArray) {
      if (node.type === 'array_item' || node.type === 'raw_nested') {
        continue;
      } else {
        inTargetArray = false;
      }
    }

    if (node.type === 'kv' || node.type === 'array_header' || node.type === 'raw_nested') {
      remainingPropertiesCount++;
    }

    newLines.push(node.raw);
  }

  // If no properties left, remove frontmatter entirely if only empty lines/comments remained
  if (remainingPropertiesCount === 0) {
    const hasMeaningfulContent = newLines.some(
      (l) => l.trim() && !l.trim().startsWith('#')
    );
    if (!hasMeaningfulContent) {
      return body;
    }
  }

  const newYaml = newLines.join('\n');
  return `---\n${newYaml}\n---\n\n${body}`;
}

/**
 * Surgically renames a property key in note content
 */
export function renamePropertyInContent(content: string, oldKey: string, newKey: string): string {
  const trimmedOld = oldKey.trim();
  const trimmedNew = newKey.trim();
  if (!trimmedOld || !trimmedNew || trimmedOld === trimmedNew) return content;

  const { ast, body } = parseFrontmatterAST(content);
  if (!ast.hasFrontmatter || ast.hasSyntaxError) return content;

  const val = ast.properties[trimmedOld];
  const type = ast.propertyTypes[trimmedOld];

  const withoutOld = removePropertyFromContent(content, trimmedOld);
  return setPropertyInContent(withoutOld, trimmedNew, val, type);
}

export const parseFrontmatter = parseFrontmatterAST;
export const updatePropertyInFrontmatter = setPropertyInContent;

/**
 * Updates multiple frontmatter properties in content in one pass
 */
export function updateFrontmatter(
  content: string,
  updates: Record<string, unknown>
): string {
  let result = content;
  for (const [k, v] of Object.entries(updates)) {
    if (v === undefined) {
      result = removePropertyFromContent(result, k);
    } else {
      result = setPropertyInContent(result, k, v);
    }
  }
  return result;
}
