# Work Context: Fixing Getting Started Page Rendering

**Date:** 2026-03-21 11:12

## Problem Statement
The code snippets (Prism JS) and Markdown tables inside the `service-registry/getting-started.md` page were not rendering correctly. Code snippets were outputting escaped HTML inside tabs (appearing as literal `<div class="prism-shortcode">` text on the page), and the table headers were missing their structured formatting and blue background.

## Approaches
- **Browser Inspection:** Launched the browser subagent to inspect the DOM of the rendered `getting-started.md` page. Confirmed that code blocks were entirely corrupted into plain text, and table headers were detached from the table body.
- **Reviewed Skill Guidelines:** Checked the `lotusdocs` skill documentation to cross-reference the correct methods for nesting shortcodes (Tabs, Prism, and Tables).
- **Identified Escaping Issue:** Discovered that the 8-space indentation natively hardcoded inside the Lotus Docs `{{< prism >}}` shortcode caused Hugo's Markdown parser (Goldmark) to interpret the HTML output as an indented literal code block when embedded inside `%`-delimited shortcodes like `{{% tab %}}`.
- **Identified Table Spacing:** Realized that Goldmark requires at least one empty line immediately preceding a Markdown table (`| URL | Description |`) to parse it as a structural table instead of plain text, especially after another shortcode wrapper. 

## Fix / Accomplishments
- **Swapped to Fenced Code Blocks:** Replaced the failing `{{< prism >}}` shortcodes nested under the Maven and Docker Compose tabs with Hugo's native fenced code blocks. Using standard Markdown fences appended with Prism annotations (````bash {linenos=table, anchorlinenos=true}````) provided identical functionality while successfully bypassing the HTML escape bug. 
- **Fixed Table Spacing:** Added a single blank line immediately after the `{{< table "table-striped table-sm" >}}` wrapper and before the `| URL | Description |` Markdown. This successfully restored the table's blue header backgrounds and Bootstrap striping formatting.

## Next Steps
- Apply these structural formatting lessons (native fenced code blocks inside tabs, blank lines preceding tables) to other documentation pages if similar issues arise.
