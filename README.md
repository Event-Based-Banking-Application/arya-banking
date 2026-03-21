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

## 🤖 AI Agent Integration (`.agents`)

This documentation repository is uniquely configured with an `.agents` directory to directly assist AI coding agents in building and maintaining the documentation:

- **Skills (`.agents/skills/`)**: Contains custom behavioral rules and knowledge references. For example, the `lotusdocs` skill teaches the agent how to correctly write markdown compatible with the theme, while the `github-codebase-knowledge` skill stores parsed intelligence about the application's microservice repositories to help the agent document them accurately.
- **Work Context (`.agents/workctx/`)**: Stores dated markdown files detailing the accomplishments, problem-solving approaches, and bug fixes applied during previous agent sessions. The agent can use the *Learn Work Context* skill to ingest these files, enabling it to learn from past work and maintain deep project context across different sessions.
