"use client";

import { useRef, useState } from "react";
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
  const codeRef = useRef<HTMLElement>(null);

  const rawLang = className?.replace("language-", "") || "";
  const lang = formatLang(rawLang);

  async function handleCopy() {
    const text = codeRef.current?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="group relative my-5 border border-border overflow-hidden">
      <div className="flex items-center justify-between bg-card px-4 py-1.5 border-b border-border">
        <span className="font-display text-[10px] font-medium text-muted-foreground uppercase tracking-widest">
          <span className="text-primary">{">"}</span> {lang || "Code"}
        </span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 font-display text-[10px] uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors"
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
      <pre className={`${className || ""} !my-0 !border-0`}>
        <code ref={codeRef} className={className}>{children}</code>
      </pre>
    </div>
  );
}
