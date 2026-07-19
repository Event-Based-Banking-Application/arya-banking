import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { marked } from "marked";

const contentDir = path.join(process.cwd(), "content/docs");

export interface DocMeta {
  slug: string;
  title: string;
  description: string;
  icon?: string;
  weight: number;
  toc?: boolean;
  tags?: string[];
  images?: string[];
}

export interface DocPage extends DocMeta {
  type: "page";
  rawContent: string;
  content: string;
}

export interface DocSection extends DocMeta {
  type: "section";
  children: (DocPage | DocSection)[];
  rawContent?: string;
  content?: string;
}

export type DocNode = DocPage | DocSection;

export interface TocItem {
  id: string;
  text: string;
  level: number;
}

function preprocessShortcodes(markdown: string, sectionSlug: string): string {
  const pageDir = sectionSlug ? `/docs/${sectionSlug}/` : "/docs/";

  let result = markdown;

  // Handle escaped quotes inside shortcodes
  result = result.replace(/\\(["'])/g, "$1");

  // Convert alert shortcodes with text attribute (self-closing)
  // {{< alert context="info" text="..." />}}
  result = result.replace(
    /\{\{<\s*alert\s+context="([^"]*)"\s+text="(.*?)"\s*\/>\}\}/g,
    (_match, context: string, text: string) => {
      text = text.replace(/\\/g, "");
      return `<div class="alert alert-${context}">${text}</div>`;
    }
  );

  // Convert alert shortcodes with body content
  // {{< alert context="info" >}}...{{< /alert >}}
  result = result.replace(
    /\{\{<\s*alert\s+context="([^"]*)"\s*>([\s\S]*?)\{\{<\s*\/alert\s*>\}\}/g,
    (_match, context: string, text: string) => {
      return `<div class="alert alert-${context}">${text.trim()}</div>`;
    }
  );

  // Convert table shortcode wrappers - just strip the tags
  // {{< table "class" >}}...{{< /table >}}
  result = result.replace(
    /\{\{<\s*table\s+[^>]*>\}\}([\s\S]*?)\{\{<\s*\/table\s*>\}\}/g,
    "$1"
  );

  // Convert ref shortcodes with absolute paths
  // {{< ref "/docs/path" >}}
  result = result.replace(
    /\{\{<\s*ref\s+"(\/docs\/[^"]+)"\s*>\}\}/g,
    (_match: string, url: string) => {
      return `${url}/`;
    }
  );

  // Convert ref shortcodes with relative paths
  // {{< ref "relative-path" >}}
  result = result.replace(
    /\{\{<\s*ref\s+"([^"]+)"\s*>\}\}/g,
    (_match: string, url: string) => {
      return `${pageDir}${url}/`;
    }
  );

  // Convert prism shortcodes to fenced code blocks
  // {{< prism lang="yaml" ... >}}...{{< /prism >}}
  result = result.replace(
    /\{\{<\s*prism\s+[^}]*>\}\}([\s\S]*?)\{\{<\s*\/prism\s*>\}\}/g,
    (_match: string, code: string) => {
      const langMatch = _match.match(/lang="([^"]*)"/);
      const lang = langMatch ? langMatch[1] : "";
      return "```" + lang + "\n" + code.trim() + "\n```";
    }
  );

  // Convert tabs shortcodes to HTML
  // {{< tabs tabTotal="N" >}}{{% tab tabName="..." %}}...{{% /tab %}}{{< /tabs >}}
  result = result.replace(
    /\{\{<\s*tabs\s+[^}]*>\}\}([\s\S]*?)\{\{<\s*\/tabs\s*>\}\}/g,
    (_match: string, body: string) => {
      const tabs: { name: string; content: string }[] = [];
      const tabRegex = /\{\{%\s*tab\s+tabName="([^"]*)"\s*%\}\}([\s\S]*?)\{\{%\s*\/tab\s*%\}/g;
      let tabMatch: RegExpExecArray | null;
      while ((tabMatch = tabRegex.exec(body)) !== null) {
        const name = tabMatch[1];
        const rawContent = tabMatch[2].trim();
        const html = marked.parse(rawContent, { async: false }) as string;
        tabs.push({ name, content: html });
      }
      if (tabs.length === 0) return _match;
      const encoded = encodeURIComponent(JSON.stringify(tabs));
      return `<div class="tabs" data-tabs="${encoded}"></div>`;
    }
  );

  return result;
}

export interface SearchEntry {
  slug: string;
  title: string;
  description: string;
  content: string;
}

function parseMdFile(filePath: string): { data: DocMeta; content: string; raw: string } {
  const raw = fs.readFileSync(filePath, "utf-8");
  const parsed = matter(raw);
  const data = parsed.data as DocMeta;
  return { data, content: parsed.content, raw };
}

function extractTocHeadings(markdown: string): TocItem[] {
  const items: TocItem[] = [];
  const headingRegex = /^(#{2,4})\s+(.+)$/gm;
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    const id = text
      .toLowerCase()
      .replace(/[^\w\s-]/g, "")
      .replace(/\s+/g, "-");
    items.push({ id, text, level });
  }

  return items;
}

function scanDirectory(
  dirPath: string,
  parentSlug: string = ""
): { section: DocSection | null; pages: DocPage[] } {
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  const children: (DocPage | DocSection)[] = [];
  const pages: DocPage[] = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".")) continue;

    const fullPath = path.join(dirPath, entry.name);

    if (entry.isDirectory()) {
      const result = scanDirectory(fullPath, `${parentSlug}${entry.name}/`);
      if (result.section) {
        children.push(result.section);
      }
      pages.push(...result.pages);
    } else if (entry.name.endsWith(".md") && entry.name !== "_index.md") {
      const slug = entry.name.replace(/\.md$/, "");
      const fullSlug = `${parentSlug}${slug}`;
      const parsed = parseMdFile(fullPath);
      const processedContent = preprocessShortcodes(parsed.content, fullSlug.replace(/\/$/, ""));

      const docPage: DocPage = {
        type: "page",
        slug: fullSlug,
        title: parsed.data.title || slug,
        description: parsed.data.description || "",
        icon: parsed.data.icon,
        weight: parsed.data.weight || 999,
        toc: parsed.data.toc,
        tags: parsed.data.tags,
        rawContent: parsed.raw,
        content: processedContent,
      };

      children.push(docPage);
      pages.push(docPage);
    }
  }

  const indexPath = path.join(dirPath, "_index.md");
  let sectionMeta: DocMeta = {
    slug: parentSlug.replace(/\/$/, ""),
    title: parentSlug.replace(/\/$/, "").split("/").pop() || "Docs",
    description: "",
    weight: 999,
  };
  let sectionContent: string | undefined;

  if (fs.existsSync(indexPath)) {
    const parsed = parseMdFile(indexPath);
    sectionMeta = {
      ...sectionMeta,
      title: parsed.data.title || sectionMeta.title,
      description: parsed.data.description || "",
      icon: parsed.data.icon,
      weight: parsed.data.weight ?? 999,
      tags: parsed.data.tags,
    };
    if (parsed.content.trim()) {
      sectionContent = preprocessShortcodes(parsed.content.trim(), parentSlug.replace(/\/$/, ""));
    }
  }

  children.sort((a, b) => a.weight - b.weight);

  const section: DocSection = {
    type: "section",
    ...sectionMeta,
    children,
    content: sectionContent,
  };

  return { section, pages };
}

let cachedTree: DocSection | null = null;

function flattenTree(node: DocSection): DocPage[] {
  const pages: DocPage[] = [];
  for (const child of node.children) {
    if (child.type === "page") {
      pages.push(child);
    } else {
      pages.push(...flattenTree(child));
    }
  }
  return pages;
}

export function getDocsTree(): DocSection {
  if (cachedTree) return cachedTree;
  const result = scanDirectory(contentDir);
  cachedTree = result.section!;
  return cachedTree;
}

export function getAllPages(): DocPage[] {
  return flattenTree(getDocsTree());
}

export function getPageBySlug(slug: string): DocPage | null {
  const pages = getAllPages();
  return pages.find((p) => p.slug === slug) || null;
}

export function getSectionBySlug(slug: string): DocSection | null {
  const tree = getDocsTree();

  function findSection(node: DocSection, targetSlug: string): DocSection | null {
    if (node.slug === targetSlug) return node;
    for (const child of node.children) {
      if (child.type === "section") {
        const found = findSection(child, targetSlug);
        if (found) return found;
      }
    }
    return null;
  }

  return findSection(tree, slug);
}

export function getParentSection(slug: string): DocSection | null {
  const tree = getDocsTree();

  function findParent(
    node: DocSection,
    targetSlug: string
  ): DocSection | null {
    for (const child of node.children) {
      if (child.type === "section") {
        if (child.slug === targetSlug) return node;
        const found = findParent(child, targetSlug);
        if (found) return found;
      }
    }
    return null;
  }

  return findParent(tree, slug);
}

export function getPrevNext(
  currentSlug: string
): { prev: DocPage | null; next: DocPage | null } {
  const pages = getAllPages();
  const idx = pages.findIndex((p) => p.slug === currentSlug);
  return {
    prev: idx > 0 ? pages[idx - 1] : null,
    next: idx < pages.length - 1 ? pages[idx + 1] : null,
  };
}

export function extractToc(content: string): TocItem[] {
  return extractTocHeadings(content);
}

export function getSearchIndex(): SearchEntry[] {
  return getAllPages()
    .filter((p) => !p.slug.includes("_index"))
    .map((p) => ({
      slug: p.slug,
      title: p.title,
      description: p.description,
      content: p.rawContent,
    }));
}

export function getBreadcrumbs(slug: string): { label: string; href: string }[] {
  const parts = slug.split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [
    { label: "Docs", href: "/docs/" },
  ];

  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    const page = getPageBySlug(current) || getSectionBySlug(current);
    if (page) {
      crumbs.push({ label: page.title, href: `/docs/${current}/` });
    } else {
      crumbs.push({
        label: part.replace(/-/g, " "),
        href: `/docs/${current}/`,
      });
    }
  }

  return crumbs;
}
