---
name: Save Work Context
description: Captures the agent's work context (accomplishments, problem statements, fixes, and approaches) into a markdown document stored in .agents/workctx/. Make sure to use this skill whenever the user says they are done, finishes a feature, mentions pushing code, asks you to "wrap up", "save progress", "log this", or anytime a significant debugging session or complex feature implementation is completed—even if they don't explicitly say "save workctx"!
---

# Save Work Context

Use this skill proactively at the end of feature implementations, deep debugging sessions, or when explicitly requested by the user, to preserve knowledge and implementation history.

## Instructions

1. **Determine the Filename**:
   - Create a short, descriptive name based on the task (e.g., `feature-auth`, `fix-prism`).
   - Append the current date and time to the short name (e.g., `YYYY-MM-DD-HHmm`).
   - The final filename should look like `feature-auth-2026-03-21-1430.md`.

2. **Determine the File Path**:
   - The file MUST be saved in the `.agents/workctx/` directory at the root of the project. Keep the location rigorously consistent.

3. **Format the Document**:
ALWAYS use this exact template:
# [Task Summary / Title]

## Accomplishments
* **[Component 1]**: High-level explanation of what was built or fixed. Include exact file names modified or newly introduced.
* **[Component 2]**: Explanation of any complex logic or architecture decisions.

## Bug Fixes & Code Decisions
* Briefly explain the *why* behind any obscure bugs encountered during the session and exactly how they were solved.
* List any specific Git hashes if a commit was just made.

## Next Steps
- [ ] Any lingering TODOs, unresolved edge-cases, or follow-ups mentioned during the session.

4. **Action**:
   - Use the `write_to_file` tool to save the document at the generated file path. Notify the user it has been meticulously cataloged.
