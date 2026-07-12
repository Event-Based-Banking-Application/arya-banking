import ReactMarkdown from "react-markdown";
import rehypeRaw from "rehype-raw";
import rehypeSlug from "rehype-slug";
import remarkGfm from "remark-gfm";
import React from "react";
import MermaidBlock from "@/components/MermaidBlock";

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
        rehypePlugins={[rehypeRaw, rehypeSlug]}
        components={{
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
              const chartText = React.Children.toArray(children).join("");
              return <MermaidBlock chart={chartText} />;
            }

            return (
              <pre>
                <code className={className}>{children}</code>
              </pre>
            );
          },
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
