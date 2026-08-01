import { notFound } from "next/navigation";
import Link from "next/link";
import {
  getDocsTree,
  getPageBySlug,
  getSectionBySlug,
  getPrevNext,
  extractToc,
  getAllPages,
  type DocSection,
  type DocNode,
  type DocPage,
} from "@/lib/content";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import Toc from "@/components/Toc";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Metadata } from "next";

type Props = {
  params: Promise<{ slug?: string[] }>;
};

export async function generateStaticParams() {
  const pages = getAllPages();
  const tree = getDocsTree();

  const slugs: { slug?: string[] }[] = [{ slug: undefined }];

  function collectSlugs(node: DocSection) {
    if (node.slug) {
      slugs.push({ slug: node.slug.split("/") });
    }
    for (const child of node.children) {
      if (child.type === "section") {
        collectSlugs(child);
      } else {
        slugs.push({ slug: child.slug.split("/") });
      }
    }
  }

  collectSlugs(tree);
  return slugs;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const slug = (await params).slug?.join("/") || "";
  const page = getPageBySlug(slug);
  const section = page ? null : getSectionBySlug(slug);

  if (page) {
    return {
      title: page.title,
      description: page.description,
    };
  }

  if (section) {
    return {
      title: section.title,
      description: section.description,
    };
  }

  return {
    title: "Docs",
    description: "Arya Banking documentation",
  };
}

function Breadcrumbs({ slug }: { slug: string }) {
  const parts = slug.split("/").filter(Boolean);
  if (parts.length === 0) return null;

  const crumbs: { label: string; href: string }[] = [{ label: "Docs", href: "/docs/" }];
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    const page = getPageBySlug(current);
    const section = page ? null : getSectionBySlug(current);
    const label = page?.title || section?.title || part.replace(/-/g, " ");
    crumbs.push({ label, href: `/docs/${current}/` });
  }

  return (
    <nav className="flex items-center gap-2 font-display text-[10px] text-muted-foreground uppercase tracking-widest mb-6">
      {crumbs.map((crumb, idx) => (
        <span key={crumb.href} className="flex items-center gap-2">
          {idx > 0 && <span className="text-border">/</span>}
          {idx === crumbs.length - 1 ? (
            <span className="text-primary">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-primary transition-colors">
              {crumb.label}
            </Link>
          )}
        </span>
      ))}
    </nav>
  );
}

function SectionLanding({ section }: { section: DocSection }) {
  const renderChildren = (children: DocNode[], depth: number = 0) => {
    if (depth > 1) return null;

    const pages = children.filter((c) => c.type === "page");
    const subSections = children.filter((c) => c.type === "section");

    return (
      <div>
        {pages.length > 0 && (
          <div className={depth === 0 ? "grid md:grid-cols-2 gap-4 mt-6" : "flex flex-col gap-3 mt-4"}>
            {pages.map((p) => (
              <Link
                key={p.slug}
                href={`/docs/${p.slug}/`}
                className="p-4 border border-border hover:border-primary/60 hover:bg-primary/5 transition-all group"
              >
                <div className="font-display text-xs font-semibold text-foreground group-hover:text-primary transition-colors uppercase tracking-wide">
                  {p.title}
                </div>
                {p.description && (
                  <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {p.description}
                  </div>
                )}
              </Link>
            ))}
          </div>
        )}
        {subSections.map((sub) => (
          <div key={sub.slug} className="mt-8">
            <div className="flex items-center gap-2 mb-1">
              <span className="font-display text-[10px] text-primary">{">"}</span>
              <Link
                href={`/docs/${sub.slug}/`}
                className="font-display text-xs font-bold text-foreground uppercase tracking-wider hover:text-primary transition-colors"
              >
                {sub.title}
              </Link>
            </div>
            {sub.description && (
              <p className="text-xs text-muted-foreground mb-3">{sub.description}</p>
            )}
            {renderChildren(sub.children, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="px-4 md:px-8 py-10 min-h-screen">
      <Breadcrumbs slug={section.slug} />
      <div className="font-display text-[10px] uppercase tracking-[0.3em] text-primary mb-4">
        {"// "}Docs
      </div>
      <h1 className="font-display text-3xl md:text-4xl font-extrabold uppercase tracking-tighter leading-[0.95] mb-4">
        {section.title}
      </h1>
      {section.description && (
        <p className="text-sm md:text-base mt-2 mb-8 max-w-3xl pb-6 border-b border-border text-muted-foreground">
          {section.description}
        </p>
      )}
      {section.content && (
        <div className="docs-content mb-8">
          <MarkdownRenderer content={section.content} />
        </div>
      )}
      {renderChildren(section.children)}
    </div>
  );
}

function PageContent({
  page,
  slug,
}: {
  page: { title: string; description: string; content: string; tags?: string[] };
  slug: string;
}) {
  const tocItems = extractToc(page.content);
  const { prev, next } = getPrevNext(slug);

  return (
    <>
      <div className="px-4 md:px-8 py-10 min-h-screen">
        <Breadcrumbs slug={slug} />
        <h1 className="font-display text-3xl md:text-4xl font-extrabold uppercase tracking-tighter leading-[0.95] mb-4">
          {page.title}
        </h1>
        {page.description && (
          <p className="text-muted-foreground text-sm md:text-base mb-6 pb-5 border-b border-border">
            {page.description}
          </p>
        )}
        <div className="docs-content max-w-none">
          <MarkdownRenderer content={page.content} />
        </div>

        {/* Tags */}
        {page.tags && page.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-border">
            {page.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] uppercase tracking-wider text-muted-foreground border border-border px-2 py-0.5 hover:border-primary hover:text-primary transition-colors"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Prev / Next */}
        <div className="flex items-stretch gap-4 mt-10 pt-6 border-t border-border">
          {prev ? (
            <Link
              href={`/docs/${prev.slug}/`}
              className="flex-1 p-4 border border-border hover:border-primary/60 hover:bg-primary/5 transition-all group"
            >
              <div className="flex items-center gap-1 font-display text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                <ArrowLeft size={12} /> Previous
              </div>
              <div className="font-display text-xs font-semibold text-foreground group-hover:text-primary transition-colors uppercase tracking-wide">
                {prev.title}
              </div>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {next ? (
            <Link
              href={`/docs/${next.slug}/`}
              className="flex-1 p-4 border border-border hover:border-primary/60 hover:bg-primary/5 transition-all group text-right"
            >
              <div className="flex items-center justify-end gap-1 font-display text-[10px] uppercase tracking-wider text-muted-foreground mb-1">
                Next <ArrowRight size={12} />
              </div>
              <div className="font-display text-xs font-semibold text-foreground group-hover:text-primary transition-colors uppercase tracking-wide">
                {next.title}
              </div>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
        </div>
      </div>

      {tocItems.length > 0 && (
        <Toc items={tocItems} />
      )}
    </>
  );
}

function DocsRoot() {
  const tree = getDocsTree();
  const topLevelPages = tree.children.filter((c) => c.type === "page");
  const sections = tree.children.filter((c) => c.type === "section");

  return (
    <div className="px-4 md:px-8 py-10 min-h-screen">
      <Breadcrumbs slug="" />
      <div className="font-display text-[10px] uppercase tracking-[0.3em] text-primary mb-4">
        {"// "}Docs.index
      </div>
      <h1 className="font-display text-3xl md:text-5xl font-extrabold uppercase tracking-tighter leading-[0.95] mb-4">
        DOCUMENTATION<span className="text-primary animate-caret">_</span>
      </h1>
      <p className="text-muted-foreground text-sm md:text-base mb-10 max-w-3xl pb-6 border-b border-border">
        Welcome to the Arya Banking documentation. Browse the sections below or
        use the sidebar to navigate.
      </p>

      {topLevelPages.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          {topLevelPages.map((p) => (
            <Link
              key={p.slug}
              href={`/docs/${p.slug}/`}
              className="p-4 border border-border hover:border-primary/60 hover:bg-primary/5 transition-all group"
            >
              <div className="font-display text-xs font-semibold text-foreground group-hover:text-primary transition-colors uppercase tracking-wide">
                {p.title}
              </div>
              {p.description && (
                <div className="text-xs text-muted-foreground mt-1">{p.description}</div>
              )}
            </Link>
          ))}
        </div>
      )}

      <div className="font-display text-[10px] uppercase tracking-[0.3em] text-primary mb-6 mt-12">
        {"// Services & Infrastructure"}
      </div>
      <div className="grid md:grid-cols-2 gap-px bg-border border border-border">
        {sections.map((section, i) => {
          const childPages = section.children.filter((c): c is DocPage => c.type === "page");
          const firstPage = childPages[0];
          const href = firstPage
            ? `/docs/${firstPage.slug}/`
            : `/docs/${section.slug}/`;

          return (
            <Link
              key={section.slug}
              href={href}
              className="bg-background p-6 group hover:bg-primary/5 transition-colors"
            >
              <div className="flex items-center gap-3 mb-2">
                <span className="font-display text-[10px] text-primary">
                  [{String(i + 1).padStart(2, "0")}]
                </span>
                <h3 className="font-display font-bold text-foreground text-sm uppercase tracking-wider group-hover:text-primary transition-colors">
                  {section.title}
                </h3>
              </div>
              {section.description && (
                <p className="text-muted-foreground text-sm leading-relaxed line-clamp-2">
                  {section.description}
                </p>
              )}
              <div className="flex items-center gap-1 mt-3 font-display text-[10px] text-primary font-semibold uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">
                View docs <ArrowRight size={12} />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export default async function DocsPage({ params }: Props) {
  const slug = (await params).slug?.join("/") || "";

  if (!slug) {
    return <DocsRoot />;
  }

  const page = getPageBySlug(slug);
  if (page) {
    return (
      <PageContent page={page} slug={slug} />
    );
  }

  const section = getSectionBySlug(slug);
  if (section) {
    return <SectionLanding section={section} />;
  }

  notFound();
}
