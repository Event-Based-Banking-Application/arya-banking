---
name: Learn Work Context
description: Reads and learns from past accomplishments, fixes, and problem statements saved in the .agents/workctx/ directory. Use this when the user asks you to "learn from the workctx" or reference past work.
---

# Learn Work Context

Triggers:
- The user asks you to "learn from the workctx".
- The user asks how a previous similar issue was fixed.
- You are starting a complex task and want to check if a similar problem has already been solved in this repository.

## Instructions

Whenever you are triggered to learn from past work contexts, follow these steps:

1. **Locate the Documents**:
   - Use the `list_dir` tool to list all files in the `c:\Users\HP\OneDrive\Documents\event-based-banking-application-docs\.agents\workctx\` directory.
   
2. **Read the Most Relevant Contexts**:
   - Look at the filenames returned by `list_dir` to determine which ones are related to your current task or the user's explicit question.
   - Use the `view_file` tool to read the contents of the most relevant `.md` files in the directory.
   - If the user asks for a general summary of everything accomplished recently, use `view_file` to quickly scan the most recently dated documents.

3. **Incorporate the Knowledge**:
   - Understand the problems that were solved, the approaches that proved successful, and the fixes applied.
   - Use this context directly to guide your coding decisions, avoid repeating past mistakes, or provide an informed summary to the user.
   - When communicating back to the user, briefly acknowledge the specific past context files you learned from (e.g., "I see from `fix-prism-rendering-2026.md` that...").
