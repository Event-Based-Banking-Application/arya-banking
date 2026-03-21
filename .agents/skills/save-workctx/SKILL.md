---
name: Save Work Context
description: Captures the agent's work context (accomplishments, problem statements, fixes, and approaches) into a markdown document stored in .agents/workctx/.
---

# Save Work Context

Use this skill whenever you are asked to save the work context, summarize what you accomplished, or capture the agent's info regarding a task.

## Instructions

1. **Determine the Filename**:
   - Create a short, descriptive name based on the task (e.g., `fix-prism-rendering`, `add-login-feature`).
   - Append the current date and time to the short name (e.g., `YYYY-MM-DD-HHmm`).
   - The final filename should look like `fix-prism-rendering-2026-03-21-1430.md`.

2. **Determine the File Path**:
   - The file MUST be saved in the `.agents/workctx/` directory at the root of the project.
   - Example path: `c:\Users\HP\OneDrive\Documents\event-based-banking-application-docs\.agents\workctx\fix-prism-rendering-2026-03-21-1430.md`.

3. **Format the Document**:
   - Use Markdown to structure the document.
   - Include the following sections:
     - **Date**: The current date and time.
     - **Problem Statement**: A brief description of the issue or the goal of the task.
     - **Approaches**: Bullet points detailing the steps taken, investigations made, or different methods tried.
     - **Fix / Accomplishments**: The final solution implemented or the work that was successfully completed.
     - **Next Steps**: (Optional) What needs to be done next, if anything.

4. **Action**:
   - Use the `write_to_file` tool to create the document at the generated file path with the formatted content.
