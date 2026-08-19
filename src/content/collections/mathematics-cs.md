---
schemaVersion: 1
code: C-002
slug: mathematics-cs
title: Mathematics & Computer Science
summary: Study systems and experiments spanning university mathematics, algorithms, and exam preparation.
type: persistent
projects:
- analysis-ii-klausurlabor
- analysis-ii-lernsystem
- algodat-study-system
- analysis-idle
anchors:
- analysis-ii-klausurlabor
- algodat-study-system
relationships:
- from: analysis-ii-klausurlabor
  to: analysis-ii-lernsystem
  label: Timed application ↔ theory
  note: Klausurlabor stresses exam execution; Lernsystem supplies the underlying definitions, theorems, and conceptual structure.
- from: analysis-ii-klausurlabor
  to: algodat-study-system
  label: Exam craft across subjects
  note: Both systems convert university material into deliberate exam-style practice, but for different technical domains.
- from: analysis-ii-lernsystem
  to: analysis-idle
  label: Formal concepts → playful systems
  note: Analysis Idle reinterprets mathematical progression in a game-like form after the formal learning system establishes
    the concepts.
- from: algodat-study-system
  to: analysis-idle
  label: Algorithms ↔ systems thinking
  note: Both reward recognizing structures and progression rules, one academically and one experimentally.
editorialNote: 'A study-system cluster built around understanding difficult university material from different angles: exam
  simulation, structured theory, algorithm practice, and an experimental game-like interpretation of analysis. Together they
  form a loop from comprehension to retrieval to timed application.'
keywords:
- mathematics
- algorithms
- exam preparation
- analysis
- computer science
- study systems
---
