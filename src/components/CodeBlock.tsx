"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

const LANG_LABELS: Record<string, string> = {
  java: "Java",
  javascript: "JavaScript",
  js: "JavaScript",
  typescript: "TypeScript",
  ts: "TypeScript",
  yaml: "YAML",
  yml: "YAML",
  bash: "Bash",
  sh: "Bash",
  shell: "Bash",
  json: "JSON",
  xml: "XML",
  sql: "SQL",
  properties: "Properties",
  docker: "Docker",
  dockerfile: "Dockerfile",
  groovy: "Groovy",
  kotlin: "Kotlin",
  python: "Python",
  go: "Go",
  rust: "Rust",
  ruby: "Ruby",
  php: "PHP",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  scala: "Scala",
  swift: "Swift",
  gradle: "Gradle",
  maven: "Maven",
  markdown: "Markdown",
  md: "Markdown",
  diff: "Diff",
  css: "CSS",
  scss: "SCSS",
  less: "Less",
  html: "HTML",
  nginx: "Nginx",
  apache: "Apache",
  makefile: "Makefile",
  make: "Makefile",
  tex: "LaTeX",
};

function formatLang(lang: string): string {
  return LANG_LABELS[lang] || lang.charAt(0).toUpperCase() + lang.slice(1);
}

export default function CodeBlock({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const rawLang = className?.replace("language-", "") || "";
  const lang = formatLang(rawLang);
  const code = String(children || "");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
    }
  }

  return (
    <div className="group relative my-5 border border-hairline-strong rounded-md overflow-hidden">
      <div className="flex items-center justify-between bg-surface-card px-4 py-1.5 border-b border-hairline-strong">
        <span className="text-xs font-medium text-muted uppercase tracking-wider">
          {lang || "Code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-xs text-muted hover:text-ink transition-colors"
          aria-label={copied ? "Copied" : "Copy code"}
        >
          {copied ? (
            <>
              <Check size={14} />
              Copied
            </>
          ) : (
            <>
              <Copy size={14} />
              Copy
            </>
          )}
        </button>
      </div>
      <pre className={`${className || ""} !my-0 !border-0 !rounded-none`}>
        <code className={className}>{children}</code>
      </pre>
    </div>
  );
}
