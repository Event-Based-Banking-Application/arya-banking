import Link from "next/link";
import { getDocsTree, type DocPage } from "@/lib/content";
import { Reveal } from "@/components/Reveal";
import { Spotlight } from "@/components/Spotlight";

const STACK = [
  "Spring Boot",
  "Apache Kafka",
  "Avro Schemas",
  "Keycloak",
  "HashiCorp Vault",
  "Spring Cloud",
  "API Gateway",
  "Service Registry",
  "OAuth2 M2M",
  "Docker",
  "Event-Driven",
  "JWT",
];

const FEATURES = [
  {
    title: "Microservices",
    desc: "7 independently deployable Spring Boot services coordinated through Spring Cloud infrastructure — gateway, registry, config, and domain services.",
  },
  {
    title: "Event-Driven",
    desc: "Apache Kafka with Avro schemas for asynchronous, reliable inter-service communication with zero point-to-point coupling.",
  },
  {
    title: "Security First",
    desc: "Keycloak IAM, HashiCorp Vault, OAuth2 M2M, and JWT-based authentication across every service boundary.",
  },
];

const METRICS = [
  { value: "07", label: "Services", note: "Spring Boot" },
  { value: "80", label: "Doc Pages", note: "Markdown" },
  { value: "11", label: "Modules", note: "Repos" },
  { value: "100%", label: "Async", note: "Kafka" },
];

export default function Home() {
  const tree = getDocsTree();
  const sections = tree.children.filter((c) => c.type === "section");

  return (
    <>
      {/* Hero */}
      <section
        id="top"
        className="px-4 md:px-8 py-24 md:py-36 grid grid-cols-4 md:grid-cols-12 gap-6 border-b border-border"
      >
        <div className="col-span-4 md:col-span-8 animate-reveal">
          <div className="flex items-center gap-3 mb-8 font-display text-[10px] uppercase tracking-[0.25em] text-primary">
            <span className="relative inline-flex size-1.5 rounded-full bg-primary text-primary shadow-[0_0_10px_currentColor] ping-dot" />
            Event-Driven Microservices Platform
          </div>
          <h1 className="font-display text-4xl md:text-6xl font-extrabold tracking-tighter leading-[0.95] text-balance animate-glitch-hover">
            EVENT BASED{" "}
            <span className="text-gradient-flow">BANKING</span> <br />
            <span
              className="text-transparent"
              style={{ WebkitTextStroke: "1px var(--color-foreground)" }}
            >
              PLATFORM
            </span>
            <span className="text-primary animate-caret ml-1">_</span>
          </h1>
          <p className="mt-10 max-w-[52ch] text-base md:text-lg text-muted-foreground text-pretty">
            Comprehensive documentation for the Arya Banking event-driven
            microservices platform — 7 Spring Boot services orchestrated over
            Apache Kafka, secured by Keycloak and Vault. Explore architecture,
            services, local development, and infrastructure guides.
          </p>
          <div className="mt-12 flex flex-wrap gap-4 font-display text-[10px] uppercase tracking-widest">
            <Link
              href="/docs/"
              className="px-4 py-3 border border-primary text-primary hover:bg-primary hover:text-primary-foreground transition-colors"
            >
              Get Started →
            </Link>
            <a
              href="https://github.com/Event-Based-Banking-Application"
              target="_blank"
              rel="noreferrer"
              className="px-4 py-3 border border-border hover:border-primary transition-colors"
            >
              View on GitHub ↗
            </a>
          </div>
        </div>
        <div className="col-span-4 md:col-span-4 flex flex-col justify-end items-start md:items-end animate-reveal [animation-delay:200ms]">
          <div className="font-display text-[10px] leading-relaxed text-muted-foreground uppercase tracking-tighter md:text-right">
            Architecture: Event-Driven<br />
            Messaging: Apache Kafka<br />
            AuthN: Keycloak · JWT<br />
            Secrets: HashiCorp Vault<br />
            Status: Fully_Documented
          </div>
        </div>
      </section>

      {/* Stack marquee */}
      <section
        aria-label="Platform stack"
        className="border-t border-b border-border bg-white/[0.02] overflow-hidden"
      >
        <div className="flex whitespace-nowrap animate-marquee font-display text-[11px] uppercase tracking-[0.25em] text-muted-foreground">
          <ul className="flex shrink-0 gap-8 px-4 md:px-8 py-4">
            {STACK.map((s) => (
              <li key={s} className="flex items-center gap-3 hover:text-primary transition-colors">
                <span className="size-1 rounded-full bg-primary" />
                {s}
              </li>
            ))}
          </ul>
          <ul aria-hidden className="flex shrink-0 gap-8 px-4 md:px-8 py-4">
            {STACK.map((s) => (
              <li key={`${s}-2`} className="flex items-center gap-3">
                <span className="size-1 rounded-full bg-primary" />
                {s}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Features */}
      <section id="platform" className="px-4 md:px-8 py-20 md:py-28 border-b border-border">
        <div className="font-display text-[10px] uppercase tracking-[0.3em] text-primary mb-10">
          {"// Platform.log"}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-border border border-border">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 90} from="scale">
              <div className="bg-background p-8 h-full hover:bg-primary/5 transition-colors">
                <div className="font-display text-xs text-primary mb-4">
                  [{String(i + 1).padStart(2, "0")}]
                </div>
                <h2 className="font-display text-lg font-bold tracking-tight mb-3">
                  {f.title}
                </h2>
                <p className="text-sm text-muted-foreground leading-relaxed">
                  {f.desc}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Metrics */}
      <section id="metrics" className="px-4 md:px-8 py-20 md:py-28 border-b border-border">
        <div className="grid grid-cols-4 md:grid-cols-12 gap-6 mb-10 items-end">
          <div className="col-span-4 md:col-span-6">
            <div className="font-display text-[10px] uppercase tracking-[0.3em] text-primary mb-4">
              {"// Docs.metrics"}
            </div>
            <h2 className="font-display text-3xl md:text-5xl font-extrabold tracking-tighter leading-[0.95]">
              THE PLATFORM <br /> AT A GLANCE
            </h2>
          </div>
          <p className="col-span-4 md:col-span-6 md:text-right text-sm text-muted-foreground max-w-[46ch] md:ml-auto">
            What the docs actually cover — every service, every page, every
            async boundary of the platform.
          </p>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-border border border-border">
          {METRICS.map((m, i) => (
            <Reveal key={m.label} delay={i * 60}>
              <div className="bg-background p-6 h-full flex flex-col justify-between gap-6 hover:bg-primary/5 transition-colors">
                <div className="font-display text-[10px] uppercase tracking-widest text-muted-foreground">
                  {String(i + 1).padStart(2, "0")} · {m.note}
                </div>
                <div>
                  <div className="font-display text-3xl md:text-4xl font-extrabold text-primary tracking-tight">
                    {m.value}
                  </div>
                  <div className="mt-1 font-display text-[11px] uppercase tracking-widest">
                    {m.label}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Services */}
      <section id="services" className="border-t border-border bg-white/[0.02] scroll-mt-24">
        <div className="px-4 md:px-8 py-4 border-b border-border flex justify-between items-center">
          <h2 className="font-display text-xs font-bold uppercase tracking-widest text-primary">
            {"// Services.log"}
          </h2>
          <Link
            href="/docs/"
            className="text-[10px] font-display uppercase tracking-widest text-muted-foreground hover:text-primary"
          >
            All docs →
          </Link>
        </div>

        {sections.map((section, i) => {
          const childPages = section.children.filter((c): c is DocPage => c.type === "page");
          const firstPage = childPages[0];
          const href = firstPage
            ? `/docs/${firstPage.slug}/`
            : `/docs/${section.slug}/`;

          return (
            <Reveal key={section.slug} as="article" delay={i * 60}>
              <Spotlight
                as="a"
                href={href}
                className="block group border-b border-border hover:bg-primary/5 transition-colors hover-lift"
              >
                <div className="px-4 md:px-8 py-10 md:py-14 grid grid-cols-4 md:grid-cols-12 gap-6">
                  <div className="col-span-1 font-display text-xs text-muted-foreground">
                    [ {String(i + 1).padStart(2, "0")} ]
                  </div>
                  <div className="col-span-3 md:col-span-5">
                    <h3 className="font-display text-xl md:text-3xl font-bold tracking-tight mb-4 group-hover:text-primary transition-colors">
                      {section.title}
                    </h3>
                    {section.description && (
                      <p className="text-sm text-muted-foreground max-w-[46ch] leading-relaxed line-clamp-3">
                        {section.description}
                      </p>
                    )}
                    <div className="mt-6 flex flex-wrap gap-2">
                      {childPages.slice(0, 5).map((p) => (
                        <span
                          key={p.slug}
                          className="px-2 py-1 border border-border text-[9px] font-display uppercase tracking-widest"
                        >
                          {p.title}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="col-span-4 md:col-span-6 flex items-end justify-between md:justify-end gap-6">
                    <span className="font-display text-[10px] uppercase tracking-widest text-muted-foreground">
                      {childPages.length} pages
                    </span>
                    <span className="font-display text-xs text-primary transition-transform duration-300 group-hover:translate-x-1">
                      →
                    </span>
                  </div>
                </div>
              </Spotlight>
            </Reveal>
          );
        })}
      </section>
    </>
  );
}
