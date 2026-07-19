import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import rehypePrism from "rehype-prism-plus";
import remarkGfm from "remark-gfm";
import React from "react";
import MermaidBlock from "@/components/MermaidBlock";
import Tabs from "@/components/Tabs";
import CodeBlock from "@/components/CodeBlock";

function extractText(children: React.ReactNode): string {
  let text = "";
  React.Children.forEach(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      text += child;
    } else if (React.isValidElement(child)) {
      const el = child as React.ReactElement<{ children?: React.ReactNode }>;
      text += extractText(el.props.children);
    }
  });
  return text;
}

function getHeadingText(children: React.ReactNode): string {
  let text = "";
  React.Children.forEach(children, (child) => {
    if (typeof child === "string" || typeof child === "number") {
      text += child;
    } else if (child && typeof child === "object" && "props" in child) {
      const el = child as { props: { children?: React.ReactNode } };
      text += getHeadingText(el.props.children);
    }
  });
  return text;
}

function HeadingRenderer({
  level,
  children,
  id: propId,
}: {
  level: number;
  children?: React.ReactNode;
  id?: string;
}) {
  const generatedId = propId || getHeadingText(children)
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .replace(/\s+/g, "-");

  const props = { id: generatedId };

  switch (level) {
    case 2: return <h2 {...props}>{children}</h2>;
    case 3: return <h3 {...props}>{children}</h3>;
    case 4: return <h4 {...props}>{children}</h4>;
    default: return <h2 {...props}>{children}</h2>;
  }
}

export default function MarkdownRenderer({
  content,
  className,
}: {
  content: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypePrism, rehypeSlug]}
        components={{
          div: ({ className, ...props }) => {
            if (className?.includes("tabs")) {
              const tabsData = (props as Record<string, string>)["data-tabs"];
              if (tabsData) return <Tabs tabs={tabsData} />;
            }
            return <div className={className} {...props} />;
          },
          h2: ({ children, id }) => (
            <HeadingRenderer level={2} id={id}>{children}</HeadingRenderer>
          ),
          h3: ({ children, id }) => (
            <HeadingRenderer level={3} id={id}>{children}</HeadingRenderer>
          ),
          h4: ({ children, id }) => (
            <HeadingRenderer level={4} id={id}>{children}</HeadingRenderer>
          ),
          a: ({ href, children }) => {
            const isExternal = href?.startsWith("http");
            return (
              <a
                href={href}
                target={isExternal ? "_blank" : undefined}
                rel={isExternal ? "noopener noreferrer" : undefined}
              >
                {children}
              </a>
            );
          },
          pre: ({ children }) => <>{children}</>,
          code: ({
            className,
            children,
          }: {
            className?: string;
            children?: React.ReactNode;
          }) => {
            if (!className) {
              return <code>{children}</code>;
            }

            const isMermaid = className.includes("language-mermaid");
            if (isMermaid) {
              const chartText = extractText(children);
              return <MermaidBlock chart={chartText} />;
            }

            return <CodeBlock className={className}>{children}</CodeBlock>;
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
