import { commandRegistry } from '../commands/commandRegistry';
import {
  MindMapNode,
  parseMarkdownToMindMap,
  serializeMindMapToMarkdown,
  countTotalNodes,
  addChildNode,
  updateNodeText,
  deleteNode,
  toggleNodeCollapse,
} from '../mindmap/mindMapTypes';

export function runFeatureP6MindMapTests(): { passed: number; failed: number; errors: string[] } {
  let passed = 0;
  let failed = 0;
  const errors: string[] = [];

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      passed++;
    } else {
      failed++;
      const err = `[FAIL] ${testName}${detail ? ` - ${detail}` : ''}`;
      errors.push(err);
      console.error(err);
    }
  }

  // Gate 1: Command Registration & Discovery
  const cmd = commandRegistry.getCommand('tools:mind-map-studio');
  assert(Boolean(cmd), 'tools:mind-map-studio command is registered in commandRegistry');
  assert(Boolean(cmd?.title.includes('Mind Map')), 'Command title includes "Mind Map"');
  assert(cmd?.shortcut === 'Alt+B', 'Command shortcut is Alt+B');
  assert(Boolean(cmd?.keywords.includes('tree')), 'Keywords include tree');
  assert(Boolean(cmd?.keywords.includes('p6')), 'Keywords include p6');

  // Gate 2: Markdown Heading & Bullet Parsing to Tree
  const sampleMarkdown = `
## Section 1: Foundations
- Atomic Concept A
- Atomic Concept B
## Section 2: Implementation
- Database Schema
  - User Table
  - Notes Table
`;
  const root = parseMarkdownToMindMap('Knowledge Architecture', sampleMarkdown);
  assert(root.text === 'Knowledge Architecture', 'Root node has correct title');
  assert(root.children.length === 2, 'Root has 2 major sections (Section 1 & Section 2)');
  assert(root.children[0].text === 'Section 1: Foundations', 'Section 1 text matches');
  assert(root.children[0].children.length === 2, 'Section 1 has 2 child concepts');
  assert(root.children[1].children[0].children.length === 2, 'Section 2 Database Schema has 2 sub-bullet tables');

  // Gate 3: Node Counting
  const total = countTotalNodes(root);
  // Root (1) + Sec1 (1) + A (1) + B (1) + Sec2 (1) + Schema (1) + User (1) + Notes (1) = 8
  assert(total === 8, `Counts total nodes accurately (expected 8, got ${total})`);

  // Gate 4: Serialization to Markdown
  const serialized = serializeMindMapToMarkdown(root);
  assert(serialized.includes('# Knowledge Architecture'), 'Serialized output includes H1 root title');
  assert(serialized.includes('## Section 1: Foundations'), 'Serialized output includes H2 section');
  assert(serialized.includes('- Atomic Concept A'), 'Serialized output includes bullet item');

  // Gate 5: Immutable Tree Mutations
  // 5a. Add child
  const sec1Id = root.children[0].id;
  const treeWithAddedChild = addChildNode(root, sec1Id, 'Atomic Concept C');
  assert(treeWithAddedChild.children[0].children.length === 3, 'Adds new child node under Section 1');
  assert(
    treeWithAddedChild.children[0].children[2].text === 'Atomic Concept C',
    'New child node has expected text'
  );

  // 5b. Update text
  const updatedTree = updateNodeText(treeWithAddedChild, sec1Id, 'Section 1: Renamed Foundations');
  assert(
    updatedTree.children[0].text === 'Section 1: Renamed Foundations',
    'Updates node text cleanly'
  );

  // 5c. Delete node
  const childToDeleteId = treeWithAddedChild.children[0].children[0].id;
  const treeAfterDelete = deleteNode(updatedTree, childToDeleteId);
  assert(treeAfterDelete.children[0].children.length === 2, 'Deletes target child node');

  // 5d. Root protection
  const treeAfterRootDelete = deleteNode(treeAfterDelete, 'node-root');
  assert(treeAfterRootDelete.id === 'node-root', 'Root node is protected from deletion');

  // 5e. Toggle Collapse
  const collapsedTree = toggleNodeCollapse(treeAfterDelete, sec1Id);
  assert(collapsedTree.children[0].collapsed === true, 'Toggles collapse to true');
  const uncollapsedTree = toggleNodeCollapse(collapsedTree, sec1Id);
  assert(uncollapsedTree.children[0].collapsed === false, 'Toggles collapse back to false');

  return { passed, failed, errors };
}
