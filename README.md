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
