import { NoteTemplate } from '../types';

export const PREBUILT_TEMPLATES: NoteTemplate[] = [
  {
    id: 'tmpl-meeting-notes',
    title: 'Meeting Notes & Action Items',
    category: 'Work',
    description: 'Structured agenda, attendees, key decisions, and assigned action checklist.',
    icon: 'Briefcase',
    type: 'text',
    color: 'blue',
    tags: ['meeting', 'work', 'notes'],
    content: `## 🤝 Meeting Overview
- **Date & Time**: ${new Date().toLocaleDateString()}
- **Attendees**: [Name 1], [Name 2]
- **Goal**: Clarify sprint scope and review architecture decisions

---

## 🎯 Discussion Topics
1. **Current Status**:
   - Updates from previous sync
2. **Blockers & Dependencies**:
   - Needs resolution on API schema

---

## 💡 Key Decisions
- [x] Adopt unified client-side search indexing
- [ ] Schedule follow-up design review

---

## 📋 Action Items
- [ ] @Author: Prepare prototype demo by Friday
- [ ] @Team: Review documentation and submit feedback
`,
  },
  {
    id: 'tmpl-daily-journal',
    title: 'Daily Journal & Standup',
    category: 'Personal',
    description: 'Track daily highlights, focus priorities, reflections, and gratitude.',
    icon: 'Sun',
    type: 'text',
    color: 'yellow',
    tags: ['journal', 'daily', 'habits'],
    content: `## ☀️ Daily Reflection — ${new Date().toLocaleDateString(undefined, { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' })}

### 🎯 Top 3 Priorities for Today
1. 
2. 
3. 

### 💡 What went well today?
- 

### 🌱 What could be improved?
- 

### 🙏 Gratitude
- Thankful for: 
`,
  },
  {
    id: 'tmpl-project-planner',
    title: 'Project Launch Plan',
    category: 'Work',
    description: 'Executive summary, milestones, tech stack, risks, and release criteria.',
    icon: 'Rocket',
    type: 'text',
    color: 'teal',
    tags: ['project', 'roadmap', 'launch'],
    content: `## 🚀 Project: [Project Name]

### 📌 Summary & Objectives
- **Target Release Date**: Q4 2026
- **Primary Objective**: Deliver a high-speed, local-first user experience

---

### 🗺️ Core Milestones
- **Phase 1 (Discovery & Spec)**: Finalize API contracts
- **Phase 2 (Implementation)**: Core data models & responsive views
- **Phase 3 (Testing & Hardening)**: Edge cases, keyboard shortcuts & sync
- **Phase 4 (Launch)**: Production deployment and telemetry review

---

### ⚠️ Risks & Mitigation
| Risk | Impact | Mitigation Strategy |
| --- | --- | --- |
| Storage quota | Medium | Use IndexedDB chunking |
| Browser compatibility | Low | Cross-browser automated tests |
`,
  },
  {
    id: 'tmpl-weekly-checklist',
    title: 'Weekly Task Sprint',
    category: 'Work',
    description: 'Checklist for weekly deliverables organized by priority.',
    icon: 'CheckSquare',
    type: 'checklist',
    color: 'green',
    tags: ['sprint', 'checklist', 'work'],
    content: 'Weekly sprint action items for high-priority features:',
    checklist: [
      { id: 't1', text: 'Plan weekly objectives & triage incoming tasks', completed: false },
      { id: 't2', text: 'Conduct code review on open pull requests', completed: false },
      { id: 't3', text: 'Implement responsive mobile fixes for layout', completed: false },
      { id: 't4', text: 'Write end-to-end user testing scenarios', completed: false },
      { id: 't5', text: 'Weekly backup & workspace cleanup', completed: false },
    ],
  },
  {
    id: 'tmpl-book-summary',
    title: 'Book Notes & Synthesis',
    category: 'Study',
    description: 'Capture core thesis, notable quotes, chapter breakdowns, and personal takeaways.',
    icon: 'BookOpen',
    type: 'text',
    color: 'purple',
    tags: ['reading', 'books', 'notes'],
    content: `## 📚 [Book Title] — [Author Name]

- **Rating**: ⭐⭐⭐⭐⭐ (5/5)
- **Finished Reading**: ${new Date().toLocaleDateString()}
- **Category**: Non-Fiction / Technology / Self-Improvement

---

### 💡 The Big Idea (1-2 Sentences)
> Summary of the author's primary argument and foundational insight.

---

### 🔑 Top Takeaways
1. **Concept 1**: Explanation and practical real-world application.
2. **Concept 2**: Why this shifts conventional thinking.
3. **Concept 3**: Actionable steps to implement immediately.

---

### 💬 Memorable Quotes
- *"First quote that resonated deeply."* (p. 42)
- *"Second insightful perspective."* (p. 118)
`,
  },
  {
    id: 'tmpl-brainstorm',
    title: 'Brainstorm & Mindmap Matrix',
    category: 'Creative',
    description: 'Rapid idea generation, 2x2 prioritization matrix, and next steps.',
    icon: 'Lightbulb',
    type: 'text',
    color: 'orange',
    tags: ['brainstorm', 'ideas', 'creative'],
    content: `## 💡 Brainstorming Session: [Topic / Challenge]

### 🎯 The Core Problem
How might we optimize our daily workflow to reduce context switching?

---

### ⚡ Raw Ideas & Angles
- **Angle A**: Automated markdown export on schedule
- **Angle B**: Interactive knowledge graph linking related concepts
- **Angle C**: Keyboard-first command palette shortcuts
- **Angle D**: Audio voice memo transcription

---

### 📊 Priority Matrix (Effort vs. Value)
- **Quick Wins (High Value, Low Effort)**:
  - Markdown formatting toolbar
  - Note duplication
- **Major Projects (High Value, High Effort)**:
  - Interactive Graph View
  - Version history diff viewer
`,
  },
  {
    id: 'tmpl-recipe',
    title: 'Recipe & Cooking Instructions',
    category: 'Personal',
    description: 'Prep time, ingredients checklist, step-by-step method, and chef tips.',
    icon: 'Utensils',
    type: 'text',
    color: 'pink',
    tags: ['recipe', 'food', 'cooking'],
    content: `## 🍳 [Recipe Name]

- **Prep Time**: 15 mins | **Cook Time**: 25 mins | **Servings**: 4
- **Difficulty**: Easy / Moderate

---

### 🛒 Ingredients
- [ ] 2 cups All-purpose flour (or gluten-free blend)
- [ ] 1 tsp Sea salt
- [ ] 2 tbsp Extra virgin olive oil
- [ ] 1 clove Garlic (minced)
- [ ] Fresh herbs (rosemary, thyme, or basil)

---

### 👨‍🍳 Step-by-Step Instructions
1. **Preparation**: Preheat oven to 200°C (400°F).
2. **Mix & Knead**: Combine ingredients in a large mixing bowl until smooth.
3. **Bake**: Place onto baking sheet and bake for 22–25 minutes until golden brown.
4. **Serve**: Garnish with fresh herbs and a drizzle of olive oil.
`,
  },
  {
    id: 'tmpl-code-snippet',
    title: 'Code Snippet & Architecture Reference',
    category: 'Development',
    description: 'Code snippets, language specs, algorithms, and usage instructions.',
    icon: 'Code',
    type: 'text',
    color: 'gray',
    tags: ['dev', 'code', 'snippet'],
    content: `## 💻 [Algorithm / Utility Name]

### 📝 Overview
A performant TypeScript implementation for memoized client-side calculations:

\`\`\`typescript
/**
 * Debounce a callback function with typed arguments
 */
export function debounce<T extends (...args: any[]) => void>(
  fn: T,
  delayMs: number
): (...args: Parameters<T>) => void {
  let timeoutId: number | undefined;
  return (...args: Parameters<T>) => {
    if (timeoutId) clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => fn(...args), delayMs);
  };
}
\`\`\`

### 🔍 Usage Example
\`\`\`typescript
const handleSearch = debounce((query: string) => {
  performSearch(query);
}, 300);
\`\`\`
`,
  },
];
