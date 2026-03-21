# Event Based Banking Application - Documentation

This repository contains the documentation for the **Event Based Banking Application**, a highly scalable event-driven microservices platform modeling the core backend of a digital banking application.

## 🚀 Overview

The documentation site is built using **[Hugo](https://gohugo.io/)** and the beautiful **[Lotus Docs](https://lotusdocs.dev/)** theme. It provides comprehensive details on the platform's architecture, services, API references, getting started guides, and more.

## 💻 Local Development

To run the documentation site locally, you'll need to have [Hugo Extended](https://gohugo.io/installation/) installed.

### Steps:

1. **Clone the repository:**
   ```bash
   git clone https://github.com/Event-Based-Banking-Application/docs.git
   cd docs
   ```

2. **Run the local server:**
   ```bash
   hugo server
   ```

3. **View the site:**
   Open your browser and navigate to `http://localhost:1313/` (or whichever port Hugo provides).

## 📁 Repository Structure

- `content/`: Contains the actual Markdown documentation pages. 
  - `docs/`: The main documentation section (e.g., Platform Overview, Service details).
- `hugo.toml`: The main configuration file for the site.
- `layouts/`: Custom overrides for the Lotus Docs HTML templates.
- `assets/`: Custom assets such as SCSS customizations and SVG logos.
- `static/`: Static files served directly (images, diagrams, scripts).

## 🤝 Contributing

When contributing to the documentation, simply add your Markdown files to the `content/docs/` directory.

- Use appropriate front matter (e.g., `title`, `weight`) for ordering.
- You can utilize [Lotus Docs Shortcodes](https://lotusdocs.dev/docs/shortcodes/) like tabs, alerts, and Mermaid diagrams to present your content.

## 🤖 Autonomous AI Integration (`.agents`)

This documentation repository is uniquely designed to be co-maintained by AI agents. It features a proactive, self-managing `.agents` ecosystem that allows the AI to iteratively learn, remember, and independently optimize its own behavior across sessions:

- **Iterative Skill Building (`.agents/skills/skill-creator`)**: A structured workflow that enables the AI to cooperatively interview the user, draft new custom skills, write evaluation prompts, and run internal benchmarks to iteratively improve itself autonomously.
- **Theme & Knowledge Skills (`.agents/skills/`)**: Contains mandatory, aggressive behavioral rules. For example, the `lotusdocs` skill natively intercepts all markdown generation to enforce Hugo/Bootstrap shortcodes (tabs, mermaid, alerts), while the `github-codebase-knowledge` skill acts as an intelligence cache of the application's microservice structures.
- **Proactive Memory (`.agents/workctx/`)**: A continuous-learning engine comprised of two heavily integrated, auto-triggering skills (`save-workctx` and `learn-workctx`). When debugging stubborn errors or finalizing large documentation features, the agent automatically captures the work using structured Component/Fix breakdowns without being explicitly asked. When starting a fresh session, it silently executes aggressive `grep_search` sweeps across this folder to internalize past architectural decisions—acting as a perpetual project memory layer.
