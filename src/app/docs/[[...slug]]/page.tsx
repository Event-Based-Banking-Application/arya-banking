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
import { ArrowLeft, ArrowRight, BookOpen } from "lucide-react";
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
    <nav className="flex items-center gap-2 text-xs text-muted uppercase tracking-wider mb-6">
      {crumbs.map((crumb, idx) => (
        <span key={crumb.href} className="flex items-center gap-2">
          {idx > 0 && <span className="text-hairline">/</span>}
          {idx === crumbs.length - 1 ? (
            <span className="text-body-strong">{crumb.label}</span>
          ) : (
            <Link href={crumb.href} className="hover:text-ink transition-colors">
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
                className="card p-4 group hover:border-hairline transition-all"
              >
                <div className="text-sm font-semibold text-ink group-hover:text-m-blue-light transition-colors">
                  {p.title}
                </div>
                {p.description && (
                  <div className="text-xs text-muted mt-1 line-clamp-2">
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
              <BookOpen size={14} className="text-m-blue-light shrink-0" />
              <Link
                href={`/docs/${sub.slug}/`}
                className="text-sm font-bold text-ink uppercase tracking-wider hover:text-m-blue-light transition-colors"
              >
                {sub.title}
              </Link>
            </div>
            {sub.description && (
              <p className="text-xs text-muted mb-3">{sub.description}</p>
            )}
            {renderChildren(sub.children, depth + 1)}
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="px-6 py-8 min-h-screen">
      <Breadcrumbs slug={section.slug} />
      <div className="flex items-center gap-3 mb-1">
        <BookOpen size={20} className="text-m-blue-light" />
        <h1 className="text-2xl font-bold text-ink uppercase tracking-tight">
          {section.title}
        </h1>
      </div>
      {section.description && (
        <p className="text-body mt-2 mb-6 max-w-3xl">{section.description}</p>
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
    <div className="flex">
      <div className="flex-1 min-w-0 px-6 py-8 min-h-screen">
        <Breadcrumbs slug={slug} />
        <h1 className="text-2xl font-bold text-ink uppercase tracking-tight mb-2">
          {page.title}
        </h1>
        {page.description && (
          <p className="text-body text-sm mb-6 pb-4 border-b border-hairline-strong">
            {page.description}
          </p>
        )}
        <div className="docs-content">
          <MarkdownRenderer content={page.content} />
        </div>

        {/* Tags */}
        {page.tags && page.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-8 pt-6 border-t border-hairline-strong">
            {page.tags.map((tag) => (
              <span
                key={tag}
                className="text-[10px] uppercase tracking-wider text-muted border border-hairline px-2 py-0.5"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Prev / Next */}
        <div className="flex items-stretch gap-4 mt-10 pt-6 border-t border-hairline-strong">
          {prev ? (
            <Link
              href={`/docs/${prev.slug}/`}
              className="flex-1 card p-4 group hover:border-hairline transition-all"
            >
              <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-muted mb-1">
                <ArrowLeft size={12} /> Previous
              </div>
              <div className="text-sm font-semibold text-ink group-hover:text-m-blue-light transition-colors">
                {prev.title}
              </div>
            </Link>
          ) : (
            <div className="flex-1" />
          )}
          {next ? (
            <Link
              href={`/docs/${next.slug}/`}
              className="flex-1 card p-4 group hover:border-hairline transition-all text-right"
            >
              <div className="flex items-center justify-end gap-1 text-[10px] uppercase tracking-wider text-muted mb-1">
                Next <ArrowRight size={12} />
              </div>
              <div className="text-sm font-semibold text-ink group-hover:text-m-blue-light transition-colors">
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
    </div>
  );
}

function DocsRoot() {
  const tree = getDocsTree();
  const topLevelPages = tree.children.filter((c) => c.type === "page");
  const sections = tree.children.filter((c) => c.type === "section");

  return (
    <div className="px-6 py-8 min-h-screen">
      <Breadcrumbs slug="" />
      <h1 className="text-2xl font-bold text-ink uppercase tracking-tight mb-2">
        Documentation
      </h1>
      <p className="text-body text-sm mb-8 max-w-3xl">
        Welcome to the Arya Banking documentation. Browse the sections below or
        use the sidebar to navigate.
      </p>

      {topLevelPages.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4 mb-10">
          {topLevelPages.map((p) => (
            <Link
              key={p.slug}
              href={`/docs/${p.slug}/`}
              className="card p-4 group hover:border-hairline transition-all"
            >
              <div className="text-sm font-semibold text-ink group-hover:text-m-blue-light transition-colors">
                {p.title}
              </div>
              {p.description && (
                <div className="text-xs text-muted mt-1">{p.description}</div>
              )}
            </Link>
          ))}
        </div>
      )}

      <div className="section-label">Services &amp; Infrastructure</div>
      <div className="grid md:grid-cols-2 gap-5">
        {sections.map((section) => {
          const childPages = section.children.filter((c): c is DocPage => c.type === "page");
          const firstPage = childPages[0];
          const href = firstPage
            ? `/docs/${firstPage.slug}/`
            : `/docs/${section.slug}/`;

          return (
            <Link
              key={section.slug}
              href={href}
              className="card p-5 group hover:border-hairline transition-all"
            >
              <div className="flex items-center gap-3 mb-2">
                <BookOpen size={16} className="text-m-blue-light shrink-0" />
                <h3 className="font-bold text-ink text-sm uppercase tracking-wider">
                  {section.title}
                </h3>
              </div>
              {section.description && (
                <p className="text-muted text-sm leading-relaxed line-clamp-2">
                  {section.description}
                </p>
              )}
              <div className="flex items-center gap-1 mt-3 text-xs text-m-blue-light font-semibold uppercase tracking-wide opacity-0 group-hover:opacity-100 transition-opacity">
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
