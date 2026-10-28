/**
 * Stop-words set for filtering high-frequency noise words during lexical indexing
 */
export const STOP_WORDS = new Set<string>([
  // Articles & Determiners
  'a', 'an', 'the', 'this', 'that', 'these', 'those', 'each', 'every', 'all', 'both',
  'another', 'such', 'some', 'any', 'no', 'none',

  // Conjunctions & Prepositions
  'and', 'but', 'or', 'nor', 'for', 'yet', 'so', 'although', 'because', 'since',
  'unless', 'while', 'where', 'after', 'before', 'though', 'even', 'about', 'above',
  'across', 'against', 'along', 'among', 'around', 'at', 'behind', 'below', 'beneath',
  'beside', 'between', 'beyond', 'by', 'down', 'during', 'except', 'from', 'in',
  'inside', 'into', 'near', 'of', 'off', 'on', 'onto', 'out', 'outside', 'over',
  'past', 'through', 'throughout', 'till', 'to', 'toward', 'towards', 'under',
  'underneath', 'until', 'up', 'upon', 'with', 'within', 'without',

  // Pronouns
  'i', 'me', 'my', 'myself', 'we', 'us', 'our', 'ours', 'ourselves', 'you', 'your',
  'yours', 'yourself', 'yourselves', 'he', 'him', 'his', 'himself', 'she', 'her',
  'hers', 'herself', 'it', 'its', 'itself', 'they', 'them', 'their', 'theirs',
  'themselves', 'what', 'which', 'who', 'whom', 'whose',

  // Common Verbs & Auxiliaries
  'am', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'having', 'do', 'does', 'did', 'doing', 'can', 'could', 'shall', 'should',
  'will', 'would', 'may', 'might', 'must', 'ought',

  // Adverbs & Common words
  'not', 'very', 'too', 'also', 'just', 'only', 'more', 'most', 'less', 'least',
  'here', 'there', 'when', 'why', 'how', 'again', 'further', 'then', 'once',
  'now', 'always', 'never', 'sometimes', 'often', 'really', 'already',

  // Code / Markdown Noise
  'http', 'https', 'www', 'com', 'org', 'net', 'null', 'undefined', 'true', 'false',
  'function', 'const', 'let', 'var', 'return', 'import', 'export', 'default',
  'div', 'span', 'class', 'style', 'width', 'height', 'href', 'src',
]);

/**
 * Checks whether a word is a stop word or trivial noise token
 */
export function isStopWord(token: string): boolean {
  if (!token || token.length <= 1) return true;
  return STOP_WORDS.has(token.toLowerCase());
}

/**
 * Filters and cleans an array of tokens
 */
export function cleanAndFilterTokens(tokens: string[]): string[] {
  return tokens
    .map((t) => t.toLowerCase().replace(/[^a-z0-9_-]/g, ''))
    .filter((t) => t.length > 1 && !STOP_WORDS.has(t));
}
