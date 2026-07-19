import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Shell from "@/components/Shell";
import { getSearchIndex } from "@/lib/content";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const siteUrl = "https://event-based-banking-application.github.io/arya-banking";

export const metadata: Metadata = {
  title: {
    template: "%s | Arya Banking Docs",
    default: "Arya Banking Docs — Event-Driven Microservices Platform",
  },
  description:
    "Comprehensive documentation for the Arya Banking event-driven microservices platform. 7 Spring Boot services with Kafka, Keycloak, Vault, and Docker.",
  metadataBase: new URL(siteUrl),
  alternates: {
    canonical: siteUrl,
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    siteName: "Arya Banking Docs",
    title: "Arya Banking Docs — Event-Driven Microservices Platform",
    description:
      "Comprehensive documentation for the Arya Banking event-driven microservices platform. 7 Spring Boot services with Kafka, Keycloak, Vault, and Docker.",
    url: siteUrl,
    images: [
      {
        url: `${siteUrl}/opengraph/card-base-2_hu_387e1b8508e2ec2b.png`,
        width: 1200,
        height: 630,
        alt: "Arya Banking Docs",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Arya Banking Docs — Event-Driven Microservices Platform",
    description:
      "Comprehensive documentation for the Arya Banking event-driven microservices platform.",
    images: [`${siteUrl}/opengraph/card-base-2_hu_387e1b8508e2ec2b.png`],
  },
  keywords: [
    "microservices",
    "spring boot",
    "kafka",
    "event-driven architecture",
    "keycloak",
    "docker",
    "arya banking",
    "java",
    "vault",
    "api gateway",
  ],
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "WebSite",
      "@id": `${siteUrl}/#website`,
      url: siteUrl,
      name: "Arya Banking Docs",
      description:
        "Documentation for the Arya Banking event-driven microservices platform.",
      inLanguage: "en-US",
      publisher: {
        "@type": "Organization",
        "@id": `${siteUrl}/#organization`,
        name: "Arya Banking",
        url: siteUrl,
        logo: `${siteUrl}/favicon.svg`,
      },
    },
    {
      "@type": "Organization",
      "@id": `${siteUrl}/#organization`,
      name: "Arya Banking",
      url: siteUrl,
      logo: `${siteUrl}/favicon.svg`,
      sameAs: ["https://github.com/Event-Based-Banking-Application"],
    },
    {
      "@type": "SoftwareApplication",
      "@id": `${siteUrl}/#softwareapplication`,
      name: "Arya Banking Platform",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Linux, Windows, macOS",
      description:
        "Event-driven banking platform with 7 microservices using Kafka-based async communication. Spring Boot, Keycloak, Vault, Docker.",
      url: "https://github.com/Event-Based-Banking-Application",
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
      },
    },
    {
      "@type": "WebPage",
      "@id": `${siteUrl}/#webpage`,
      url: siteUrl,
      name: "Arya Banking Docs — Event-Driven Microservices Platform",
      description:
        "Comprehensive documentation for the Arya Banking event-driven microservices platform.",
      inLanguage: "en-US",
      isPartOf: {
        "@id": `${siteUrl}/#website`,
      },
      about: {
        "@id": `${siteUrl}/#softwareapplication`,
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const searchIndex = getSearchIndex();

  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} font-sans antialiased`}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <Shell searchIndex={searchIndex}>{children}</Shell>
      </body>
    </html>
  );
}
