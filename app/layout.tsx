import type { Metadata } from "next";
import { Bebas_Neue, Inter } from "next/font/google";
import Script from "next/script";
import { SmoothScrollProvider } from "@/components/smooth-scroll";
import "lenis/dist/lenis.css";
import "./globals.css";

const headingFont = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-heading",
});

const bodyFont = Inter({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Desi Movies Stream",
  description: "TMDB-powered category-wise movie streaming dashboard",
  verification: {
    google: "oorAc53NsjHZ29qHc0zxqc7PSAZcNpuWgapitMBoYjw",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${headingFont.variable} ${bodyFont.variable}`}
      suppressHydrationWarning
    >
      <body className="font-[var(--font-body)]" suppressHydrationWarning>
        <SmoothScrollProvider>{children}</SmoothScrollProvider>
        {/* Cloudflare Web Analytics */}
        <Script
          src="https://static.cloudflareinsights.com/beacon.min.js"
          data-cf-beacon='{"token": "0b7930b7d8354f0689c6c60866da9a58"}'
          strategy="afterInteractive"
        />
      </body>
    </html>
  );
}
