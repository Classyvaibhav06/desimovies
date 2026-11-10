import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { LEGAL_DOCS, LEGAL_NAV } from "@/lib/legal-docs";

export function generateStaticParams() {
  return Object.keys(LEGAL_DOCS).map((slug) => ({ slug }));
}

export default async function LegalPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = LEGAL_DOCS[slug];

  if (!doc) notFound();

  return (
    <main className="relative z-[1] mx-auto w-full max-w-[907px] px-6 pb-16 pt-24 md:px-10 md:pt-32 lg:px-14">
      {/* Header */}
      <header className="mb-10 flex items-center justify-between gap-4">
        <Link
          href="/"
          aria-label="Back to DesiMovies home"
          className="relative select-none drop-shadow-[0_4px_18px_rgba(0,0,0,0.55)]"
        >
          <Image
            src="/desimovies-logo.png"
            alt="DesiMovies"
            width={200}
            height={68}
            priority
            className="h-9 w-auto sm:h-10"
          />
        </Link>
        <Link
          href="/"
          className="rounded-full border border-white/[0.08] bg-[#0f0f0f]/80 px-4 py-2 text-[13px] font-medium text-[#b3b3b3] backdrop-blur-xl transition-colors hover:border-white/25 hover:text-white"
        >
          Back to browse
        </Link>
      </header>

      <h1 className="text-[34px] font-bold leading-[1.08] tracking-[-0.03em] text-[#f2f2f2] md:text-[46px]">
        {doc.title}
      </h1>
      <p className="mt-3 text-[13px] text-[#6f6f6f]">Last updated: {doc.updated}</p>

      <p className="mt-8 text-[16px] leading-6 text-[#8c8c8c]">{doc.intro}</p>

      {doc.sections.map((section) => (
        <section key={section.title}>
          <h2 className="mt-10 mb-4 text-[20px] font-semibold tracking-[-0.5px] text-white/90">
            {section.title}
          </h2>
          {section.paragraphs.map((paragraph) => (
            <p
              key={paragraph.slice(0, 40)}
              className="mb-3 text-[16px] leading-6 text-[#8c8c8c]"
            >
              {paragraph}
            </p>
          ))}
        </section>
      ))}

      {/* Legal navigation */}
      <nav className="mt-14 flex flex-wrap items-center gap-3 border-t border-white/[0.08] pt-8">
        {LEGAL_NAV.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="rounded-full border border-white/[0.08] bg-[#181818] px-4 py-2 text-[13px] font-medium text-[#b3b3b3] transition-colors hover:border-white/25 hover:text-white"
          >
            {item.label}
          </Link>
        ))}
        <a
          href="https://www.vidy.st/"
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-full border border-white/[0.08] bg-[#181818] px-4 py-2 text-[13px] font-medium text-[#b3b3b3] transition-colors hover:border-white/25 hover:text-white"
        >
          Streaming API
        </a>
      </nav>
    </main>
  );
}
