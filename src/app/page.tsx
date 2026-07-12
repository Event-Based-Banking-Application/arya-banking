import Link from "next/link";
import { getDocsTree, type DocPage } from "@/lib/content";
import { ArrowRight, BookOpen, Code, Server, Shield } from "lucide-react";

const features = [
  {
    icon: Server,
    title: "Microservices",
    desc: "7 independently deployable Spring Boot services coordinated through Spring Cloud infrastructure.",
  },
  {
    icon: Code,
    title: "Event-Driven",
    desc: "Apache Kafka with Avro schemas for asynchronous, reliable inter-service communication.",
  },
  {
    icon: Shield,
    title: "Security First",
    desc: "Keycloak IAM, HashiCorp Vault, OAuth2 M2M, and JWT-based authentication.",
  },
];

export default function Home() {
  const tree = getDocsTree();
  const sections = tree.children.filter((c) => c.type === "section");

  return (
    <div>
      {/* Hero */}
      <section className="border-b border-hairline/50">
        <div className="max-w-6xl mx-auto px-6 py-24 md:py-32">
          <div className="max-w-3xl">
            <div className="section-label">Documentation</div>
            <h1 className="text-[clamp(2rem,5vw,3.5rem)] font-bold text-ink uppercase tracking-tight leading-[1.1] mb-6">
              Event Based Banking{" "}
              <span className="gradient-text">Platform</span>
            </h1>
            <p className="text-body text-lg leading-relaxed mb-8 max-w-2xl">
              Comprehensive documentation for the Arya Banking event-driven
              microservices platform. Explore architecture, services, local
              development, and infrastructure guides.
            </p>
            <div className="flex flex-wrap gap-4">
              <Link
                href="/docs/"
                className="inline-flex items-center gap-2 border border-ink text-ink px-6 py-3 text-sm font-bold uppercase tracking-wider hover:bg-ink hover:text-canvas transition-colors"
              >
                Get Started <ArrowRight size={16} />
              </Link>
              <Link
                href="https://github.com/Event-Based-Banking-Application"
                target="_blank"
                className="inline-flex items-center gap-2 border border-hairline text-muted px-6 py-3 text-sm font-bold uppercase tracking-wider hover:text-ink hover:border-muted transition-colors"
              >
                View on GitHub
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-hairline/50">
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="section-label">Overview</div>
          <div className="grid md:grid-cols-3 gap-6 mt-8">
            {features.map((f) => (
              <div key={f.title} className="brutal-card p-5">
                <div className="brutal-card__header">
                  <div className="brutal-card__icon">
                    <f.icon size={20} />
                  </div>
                  <div className="brutal-card__title">{f.title}</div>
                </div>
                <div className="text-body text-sm leading-relaxed">
                  {f.desc}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Services Grid */}
      <section>
        <div className="max-w-6xl mx-auto px-6 py-20">
          <div className="section-label">Services</div>
          <h2 className="text-2xl font-bold text-ink mb-8 uppercase tracking-tight">
            Platform Components
          </h2>
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
      </section>
    </div>
  );
}
