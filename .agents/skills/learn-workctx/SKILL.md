---
name: Learn Work Context
description: Searches for, reads, and learns from past accomplishments, bug fixes, and problem statements saved in the .agents/workctx/ directory. Make sure to use this skill whenever you start working on a bug, when tackling an architectural pattern (like Auth or Database), when the user asks "how did we do this before?", or if you get stuck on an error that feels familiar—even if the user doesn't explicitly ask you to "learn from workctx"!
---

# Learn Work Context

Proactively harness this skill to prevent repeating past mistakes and to synchronize with previously established architectural workarounds.

## Instructions

Whenever you are triggered to learn from past work contexts, follow these steps:

1. **Locate Relevant Documents**:
   - Use the `find_by_name` tool to rapidly search for files in `.agents/workctx/` matching keywords from your current task (e.g., `*auth*.md`, `*prism*.md`).
   - If you need to search inside the files for a specific cryptic error message or stack trace, use the `grep_search` tool on the `.agents/workctx/` directory to aggressively hunt for the exact text!
   
2. **Read the Context**:
   - Once you have isolated the most relevant file paths, use `view_file` to read the specific documents. Avoid relying on memory—query the exact history.
   
3. **Incorporate the Knowledge**:
   - Apply the documented architectural decisions, root-cause analyses, and workarounds to your current task directly.
   - Explicitly acknowledge to the user which file you learned from before proposing your new implementation plan (e.g., "Based on `fix-prism-rendering-2026.md`, I see we previously determined that...").
