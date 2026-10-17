export interface MindMapNode {
  id: string;
  text: string;
  children: MindMapNode[];
  collapsed?: boolean;
  color?: string;
}

const BRANCH_COLORS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Purple
];

/**
 * Parses markdown headings (#, ##, ###) and nested list items into a hierarchical MindMap tree
 */
export function parseMarkdownToMindMap(title: string, markdown: string): MindMapNode {
  const rootText = title.trim() || 'Central Concept';
  const root: MindMapNode = {
    id: 'node-root',
    text: rootText,
    children: [],
  };

  const lines = markdown.split('\n');

  // Stack of active nodes and their depths
  // Level: 0 = root, 1 = H1 / top bullet, 2 = H2 / sub-bullet, etc.
  interface StackItem {
    node: MindMapNode;
    level: number;
  }
  const stack: StackItem[] = [{ node: root, level: 0 }];

  let idCounter = 1;
  let currentSectionLevel = 1;

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line.trim()) continue;

    // Check heading: # Heading 1, ## Heading 2, etc.
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      currentSectionLevel = level;
      const text = headingMatch[2].trim();
      const newNode: MindMapNode = {
        id: `node-${idCounter++}`,
        text,
        children: [],
      };

      // Pop stack until parent has strictly lower level
      while (stack.length > 1 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }

      const parent = stack[stack.length - 1].node;
      parent.children.push(newNode);
      stack.push({ node: newNode, level });
      continue;
    }

    // Check bullet list: - item, * item, 1. item
    const bulletMatch = line.match(/^(\s*)([-*+]|\d+\.)\s+(.*)$/);
    if (bulletMatch) {
      const indentSpaces = bulletMatch[1].length;
      const text = bulletMatch[3].trim();
      // Indent level is strictly deeper than current heading section
      const indentLevel = currentSectionLevel + 1 + Math.floor(indentSpaces / 2);

      const newNode: MindMapNode = {
        id: `node-${idCounter++}`,
        text,
        children: [],
      };

      while (stack.length > 1 && stack[stack.length - 1].level >= indentLevel) {
        stack.pop();
      }

      const parent = stack[stack.length - 1].node;
      parent.children.push(newNode);
      stack.push({ node: newNode, level: indentLevel });
      continue;
    }
  }

  // Assign distinct branch colors to root children
  root.children.forEach((child, idx) => {
    child.color = BRANCH_COLORS[idx % BRANCH_COLORS.length];
  });

  return root;
}

/**
 * Serializes a MindMapNode tree back into clean, formatted Markdown outline
 */
export function serializeMindMapToMarkdown(root: MindMapNode): string {
  let md = `# ${root.text}\n\n`;

  function serializeChildren(nodes: MindMapNode[], depth: number) {
    for (const node of nodes) {
      if (depth === 1) {
        // Top-level sections as H2
        md += `## ${node.text}\n`;
        serializeChildren(node.children, depth + 1);
        md += `\n`;
      } else {
        const indent = '  '.repeat(depth - 2);
        md += `${indent}- ${node.text}\n`;
        serializeChildren(node.children, depth + 1);
      }
    }
  }

  serializeChildren(root.children, 1);
  return md.trim();
}

/**
 * Counts total nodes in a MindMap tree
 */
export function countTotalNodes(node: MindMapNode): number {
  let count = 1;
  for (const child of node.children) {
    count += countTotalNodes(child);
  }
  return count;
}

/**
 * Deep clones and adds a child node to a given parent ID
 */
export function addChildNode(
  node: MindMapNode,
  parentId: string,
  newText: string = 'New Branch'
): MindMapNode {
  if (node.id === parentId) {
    const newChild: MindMapNode = {
      id: `node-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      text: newText,
      children: [],
      color: node.color,
    };
    return {
      ...node,
      collapsed: false,
      children: [...node.children, newChild],
    };
  }

  return {
    ...node,
    children: node.children.map((child) => addChildNode(child, parentId, newText)),
  };
}

/**
 * Deep clones and updates the text of a target node ID
 */
export function updateNodeText(
  node: MindMapNode,
  targetId: string,
  newText: string
): MindMapNode {
  if (node.id === targetId) {
    return { ...node, text: newText };
  }
  return {
    ...node,
    children: node.children.map((child) => updateNodeText(child, targetId, newText)),
  };
}

/**
 * Deep clones and deletes a target node from the tree (cannot delete root)
 */
export function deleteNode(node: MindMapNode, targetId: string): MindMapNode {
  if (node.id === targetId) return node; // cannot delete root
  return {
    ...node,
    children: node.children
      .filter((child) => child.id !== targetId)
      .map((child) => deleteNode(child, targetId)),
  };
}

/**
 * Toggles collapsed state on a node
 */
export function toggleNodeCollapse(node: MindMapNode, targetId: string): MindMapNode {
  if (node.id === targetId) {
    return { ...node, collapsed: !node.collapsed };
  }
  return {
    ...node,
    children: node.children.map((child) => toggleNodeCollapse(child, targetId)),
  };
}
