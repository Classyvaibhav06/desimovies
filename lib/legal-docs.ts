export type LegalSection = {
  title: string;
  paragraphs: string[];
};

export type LegalDoc = {
  title: string;
  updated: string;
  intro: string;
  sections: LegalSection[];
};

export const LEGAL_DOCS: Record<string, LegalDoc> = {
  privacy: {
    title: "Privacy Policy",
    updated: "November 2026",
    intro:
      "At DesiMovies, your privacy and digital security are highly prioritized. This Privacy Policy outlines how we handle data when you use our web application. By using DesiMovies, you consent to the practices described below.",
    sections: [
      {
        title: "1. Information We Collect",
        paragraphs: [
          "DesiMovies is designed to be as minimally invasive as possible. We only collect the information necessary to provide the features of the app.",
          "Local Preferences: Your watchlist, watch history and watch positions are stored locally in your own browser (localStorage). They never leave your device unless you clear them.",
          "Account Data: If you choose to register, we store your email address, username and an encrypted password. For OAuth logins we only store the basic profile information handed over by the authentication provider.",
          "Usage Data: We may store anonymous, aggregated usage information (pages viewed, titles played) to understand which sections of the catalogue are popular and to improve the experience.",
        ],
      },
      {
        title: "2. Third-Party Content & IP Addresses",
        paragraphs: [
          "Crucial Notice: DesiMovies does NOT host any media. All video streams, artwork, metadata and download links are fetched directly from external, third-party servers (including our streaming API providers).",
          "Because your browser connects directly to these third-party servers to stream video or download files, those external servers will be able to see your IP address. We do not control these third-party servers, and their data collection practices are governed by their respective privacy policies. If you wish to protect your IP address from third-party hosts, we strongly recommend using a reputable VPN service.",
          "We also request artwork metadata from The Movie Database (TMDB) and Fanart. Those providers receive the same request details as any other third-party host you connect to.",
        ],
      },
      {
        title: "3. Data Sharing & Security",
        paragraphs: [
          "We will never sell, rent or trade your personal information to marketers or unauthorized third parties. Where you connect an account, we rely on industry-standard encryption to protect your credentials.",
          "However, no method of transmission over the internet is 100% secure. Because playback happens inside embedded third-party players, the stream provider — not DesiMovies — handles the media request itself.",
        ],
      },
      {
        title: "4. Cookies & Local Storage",
        paragraphs: [
          "DesiMovies does not use advertising cookies. We only use a small number of browser storage entries to remember your preferences (theme, language, watchlist, watch positions) and, if you enable analytics, to count page views in aggregate.",
          "You can clear every stored item at any time from your browser settings, or by clearing site data for this domain.",
        ],
      },
      {
        title: "5. Contact Us",
        paragraphs: [
          "If you have questions about your privacy or wish to request data deletion, please contact us through our help page. Because most of our data lives on your own device, clearing your browser storage removes it immediately.",
        ],
      },
    ],
  },
  terms: {
    title: "Terms of Service",
    updated: "November 2026",
    intro:
      "Welcome to DesiMovies. These Terms of Service (\"Terms\") govern your use of the DesiMovies platform. By accessing or using our services, you agree to be bound by these Terms.",
    sections: [
      {
        title: "1. Nature of the Service",
        paragraphs: [
          "DesiMovies is an automated search engine and indexing tool. We provide a sleek, unified interface that aggregates metadata and links to media files available on the public internet.",
          "DesiMovies does not host, upload or control any of the video content, streams or download files made available through the platform. All media is fetched directly from third-party servers. We do not verify the legality or licensing of the content hosted on those third-party servers.",
        ],
      },
      {
        title: "2. User Responsibility",
        paragraphs: [
          "By using DesiMovies, you acknowledge that you are accessing third-party content at your own risk. You agree to use the service for personal, non-commercial entertainment purposes only. You are solely responsible for ensuring that your access to and consumption of third-party streams complies with the laws and regulations of your jurisdiction.",
          "DesiMovies acts purely as a conduit and cannot be held liable for any copyright infringements, malware or damages resulting from interactions with third-party servers.",
        ],
      },
      {
        title: "3. Account Security",
        paragraphs: [
          "You are responsible for keeping your login credentials confidential and for all activity that happens under your account. If you believe your account has been compromised, change your password immediately and notify us.",
          "Because watchlists and watch positions are stored locally in your browser, clearing your browser data or using a different device will reset them.",
        ],
      },
      {
        title: "4. Intellectual Property",
        paragraphs: [
          "The DesiMovies name, logo, interface and source code are the property of the DesiMovies project and may not be reproduced without permission. Movie metadata, posters and artwork belong to their respective owners (including TMDB and Fanart) and are used for identification purposes.",
          "Titles, artwork and metadata are provided for personal, non-commercial use only.",
        ],
      },
      {
        title: "5. Modifications to Terms",
        paragraphs: [
          "We may update these Terms from time to time to reflect changes in the service or in applicable law. Continued use of DesiMovies after an update means you accept the revised Terms. The \"Last updated\" date above always reflects the current version.",
        ],
      },
    ],
  },
  dmca: {
    title: "DMCA Notice",
    updated: "November 2026",
    intro:
      "DesiMovies functions strictly as an automated search engine and metadata aggregator. We DO NOT host, store, stream or upload any video, media file or copyrighted material on our servers.",
    sections: [
      {
        title: "1. Automated Third-Party Indexing",
        paragraphs: [
          "All media content, streams and downloads accessible via DesiMovies are fetched in real time from unaffiliated third-party websites and APIs. DesiMovies acts merely as a client-side directory and proxy tool, similar to Google Search, linking you to content that is already publicly accessible on the internet.",
          "We have no control over the content hosted by these third parties. We do not curate, upload or manage any of the media files. Therefore, we cannot directly delete or remove videos from the internet because they do not reside on our infrastructure.",
        ],
      },
      {
        title: "2. Copyright Infringement & Removal",
        paragraphs: [
          "DesiMovies fully respects intellectual property rights. If you are a copyright owner or an authorized agent and you believe that a specific link or embedded player on DesiMovies infringes upon your copyright, you may submit a takedown request.",
          "Upon receiving a valid request, we will promptly blacklist the affected title and remove it from our search results and from the embedded player catalogue.",
        ],
      },
      {
        title: "3. Submitting a Notice",
        paragraphs: [
          "A valid notice must include: (a) identification of the copyrighted work you claim has been infringed; (b) the URL of the specific title on DesiMovies; (c) your contact information; (d) a statement that you have a good-faith belief that the use is not authorized by the copyright owner, its agent or the law; and (e) a physical or electronic signature of the copyright owner or a person authorized to act on their behalf.",
          "Send notices to the contact address listed on our help page. We respond to every complete notice within a reasonable timeframe.",
        ],
      },
    ],
  },
};

export const LEGAL_NAV = [
  { href: "/legal/privacy", label: "Privacy" },
  { href: "/legal/terms", label: "Terms" },
  { href: "/legal/dmca", label: "DMCA" },
  { href: "/help", label: "Help" },
];
