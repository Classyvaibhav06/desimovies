import Link from "next/link";
import Image from "next/image";
import { LEGAL_NAV } from "@/lib/legal-docs";

const FAQ_GROUPS = [
  {
    title: "About DesiMovies",
    items: [
      {
        q: "What is DesiMovies?",
        a: "DesiMovies is a free streaming front-end. It pulls catalogue metadata and artwork from TMDB and links to publicly available playback sources through our streaming API — one clean interface for movies, shows and anime.",
      },
      {
        q: "Do you host the movies and shows?",
        a: "No. We host no media at all. Every stream is fetched directly from third-party servers in your browser, exactly like a search engine pointing you at pages that already exist.",
      },
    ],
  },
  {
    title: "Playback",
    items: [
      {
        q: "Why isn't a title playing?",
        a: "Open the title and use the source dropdown in the player to try another provider. Some sources rate-limit or geo-block; switching usually resolves it.",
      },
      {
        q: "How do I try another source?",
        a: "Inside the player header, pick a different entry from the Source dropdown. The embed reloads instantly with the new provider.",
      },
      {
        q: "Why are new releases missing?",
        a: "Catalogue rows are refreshed from TMDB periodically. A title may also be missing from a specific provider even when it appears in our catalogue.",
      },
    ],
  },
  {
    title: "Connection",
    items: [
      {
        q: "Should I use a VPN?",
        a: "Third-party hosts see your IP address when you stream. If that matters to you, a reputable VPN keeps your address private from those hosts.",
      },
      {
        q: "The video buffers or errors out",
        a: "Try another source, then reload the page. Buffering is usually the provider's CDN rather than your connection.",
      },
    ],
  },
  {
    title: "Account & profiles",
    items: [
      {
        q: "Do I need an account?",
        a: "No. DesiMovies works without signing in — your watchlist and watch positions live in your own browser.",
      },
      {
        q: "Where is my watchlist stored?",
        a: "In your browser's local storage. Clearing site data for this domain removes it, and the same applies to your watch positions.",
      },
    ],
  },
  {
    title: "Player & extras",
    items: [
      {
        q: "Why is there no sound at first?",
        a: "Browsers block autoplay with sound until you interact with the page. Press play once and the player will start with audio.",
      },
      {
        q: "Does the player resume where I stopped?",
        a: "Yes. The player reports your position back to DesiMovies, we store it locally and pass it back on the next visit so playback continues where you left off.",
      },
    ],
  },
  {
    title: "Privacy & copyright",
    items: [
      {
        q: "This is my copyrighted work",
        a: "Send us a DMCA notice with the title URL and we will blacklist that title from our catalogue and player. The full process is on the DMCA page.",
      },
      {
        q: "What data do you keep?",
        a: "Preferences such as your watchlist and watch positions, stored locally in your browser. No advertising trackers. The full details are on the Privacy page.",
      },
    ],
  },
];

export default function HelpPage() {
  return (
    <main className="relative z-[1] mx-auto w-full max-w-[907px] px-6 pb-16 pt-24 md:px-10 md:pt-32 lg:px-14">
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
        Help
      </h1>
      <p className="mt-3 text-[16px] leading-6 text-[#8c8c8c]">
        Most questions are already answered below.
      </p>

      {FAQ_GROUPS.map((group) => (
        <section key={group.title} className="mt-10">
          <h2 className="mb-4 text-[20px] font-semibold tracking-[-0.5px] text-white/90">
            {group.title}
          </h2>
          <div className="space-y-3">
            {group.items.map((item) => (
              <div
                key={item.q}
                className="rounded-xl border border-white/[0.06] bg-[#181818] p-4 transition-colors hover:border-white/[0.16]"
              >
                <h3 className="text-[15px] font-semibold text-[#f2f2f2]">
                  {item.q}
                </h3>
                <p className="mt-2 text-[14px] leading-6 text-[#8c8c8c]">
                  {item.a}
                </p>
              </div>
            ))}
          </div>
        </section>
      ))}

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
