import type { Metadata } from "next";
import { Bebas_Neue, Space_Grotesk } from "next/font/google";
import "./globals.css";

const headingFont = Bebas_Neue({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-heading",
});

const bodyFont = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-body",
});

export const metadata: Metadata = {
  title: "Desi Movies Stream",
  description: "TMDB-powered category-wise movie streaming dashboard",
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
        {children}
      </body>
    </html>
  );
}
