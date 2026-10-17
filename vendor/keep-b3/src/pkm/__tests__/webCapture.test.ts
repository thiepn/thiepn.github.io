import { convertHTMLToMarkdown, extractMetadataFromHTML, cleanHTMLStructure } from '../htmlToMarkdown';
import { composeCapturedNoteContent } from '../webCapture';

export function runWebCaptureTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, msg: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      errors.push(msg);
      console.error(`  FAIL: ${msg}`);
    }
  }

  // 1. Basic formatting conversion
  const basicHtml = `
    <h1>Title of Article</h1>
    <p>This is a <strong>bold</strong> and <em>italic</em> sentence with a <a href="https://example.com">link</a>.</p>
    <blockquote>Wise words from author</blockquote>
  `;
  const basicRes = convertHTMLToMarkdown(basicHtml);
  assert(basicRes.markdown.includes('# Title of Article'), 'Headings convert correctly');
  assert(basicRes.markdown.includes('**bold**'), 'Strong tags convert to **');
  assert(basicRes.markdown.includes('*italic*'), 'Em tags convert to *');
  assert(basicRes.markdown.includes('[link](https://example.com)'), 'Links convert to Markdown links');
  assert(basicRes.markdown.includes('> Wise words from author'), 'Blockquotes convert to >');

  // 2. Lists and task lists
  const listHtml = `
    <ul>
      <li>First bullet</li>
      <li>Second bullet</li>
    </ul>
    <ol>
      <li>Ordered 1</li>
      <li>Ordered 2</li>
    </ol>
    <ul>
      <li><input type="checkbox" checked disabled> Done task</li>
      <li><input type="checkbox" disabled> Pending task</li>
    </ul>
  `;
  const listRes = convertHTMLToMarkdown(listHtml);
  assert(listRes.markdown.includes('First bullet'), 'Unordered lists convert items');
  assert(listRes.markdown.includes('Ordered 1'), 'Ordered lists convert items');
  assert(listRes.markdown.includes('[x] Done task'), 'Checked task inputs convert to [x]');
  assert(listRes.markdown.includes('[ ] Pending task'), 'Unchecked task inputs convert to [ ]');

  // 3. Security and XSS sanitization
  const dangerousHtml = `
    <h3>Safe Heading</h3>
    <script>alert("xss")</script>
    <img src="x" onerror="alert('pwnd')" />
    <a href="javascript:alert(1)">Malicious link</a>
    <p onclick="doBadThing()">Click me</p>
  `;
  const safeRes = convertHTMLToMarkdown(dangerousHtml);
  assert(!safeRes.markdown.includes('alert("xss")'), 'Scripts are stripped from conversion');
  assert(!safeRes.markdown.includes('onerror'), 'Event handlers are stripped from conversion');
  assert(!safeRes.markdown.includes('javascript:'), 'javascript: URLs are stripped');
  assert(safeRes.markdown.includes('### Safe Heading'), 'Safe content is preserved');

  // 4. Code and pre blocks
  const codeHtml = `
    <p>Inline code: <code>const x = 10;</code></p>
    <pre><code class="language-typescript">function add(a: number, b: number): number {
  return a + b;
}</code></pre>
  `;
  const codeRes = convertHTMLToMarkdown(codeHtml);
  assert(codeRes.markdown.includes('`const x = 10;`'), 'Inline code converts to backticks');
  assert(codeRes.markdown.includes('```typescript'), 'Fenced code blocks preserve language class');
  assert(codeRes.markdown.includes('function add(a: number, b: number): number'), 'Code block content is preserved');

  // 5. Wikipedia math image conversion to KaTeX
  const wikiMathHtml = `
    <p>The equation is: <img class="mwe-math-fallback-image-inline" alt="E = mc^2" src="https://wikimedia.org/math.svg"></p>
  `;
  const wikiRes = convertHTMLToMarkdown(wikiMathHtml);
  assert(wikiRes.markdown.includes('$E = mc^2$'), 'Wikipedia math images convert to inline KaTeX LaTeX syntax');

  // 6. Tables conversion
  const tableHtml = `
    <table>
      <thead>
        <tr><th>Feature</th><th>Status</th></tr>
      </thead>
      <tbody>
        <tr><td>Ingestion</td><td>Complete</td></tr>
        <tr><td>Security</td><td>Verified</td></tr>
      </tbody>
    </table>
  `;
  const tableRes = convertHTMLToMarkdown(tableHtml);
  assert(tableRes.hasTables === true, 'hasTables flag detected in converted result');
  assert(tableRes.markdown.includes('| Feature | Status |'), 'Table header converts to Markdown table');
  assert(tableRes.markdown.includes('| Ingestion | Complete |'), 'Table rows convert to Markdown table rows');

  // 7. Metadata extraction and source attribution composition
  const pageHtml = `
    <title>Understanding Quantum Computing</title>
    <link rel="canonical" href="https://techjournal.org/quantum-guide" />
    <meta name="author" content="Dr. Alan" />
    <p>Quantum computing uses qubits.</p>
  `;
  const meta = extractMetadataFromHTML(pageHtml, 'https://techjournal.org/quantum-guide');
  assert(meta.title === 'Understanding Quantum Computing', 'Extracts page title from <title>');
  assert(meta.sourceUrl === 'https://techjournal.org/quantum-guide', 'Extracts canonical source URL');
  assert(meta.author === 'Dr. Alan', 'Extracts author metadata');

  const composed = composeCapturedNoteContent('Quantum computing uses qubits.', {
    sourceUrl: 'https://techjournal.org/quantum-guide',
    title: 'Understanding Quantum Computing',
    includeAttribution: true,
  });
  assert(composed.includes('https://techjournal.org/quantum-guide'), 'Attribution block is generated cleanly');

  return { passed, failed, errors };
}
