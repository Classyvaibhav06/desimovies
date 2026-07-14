import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**"
      },
      {
        protocol: "https",
        hostname: "assets.fanart.tv",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "m.media-amazon.com",
        pathname: "/images/M/**"
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**"
      },
      {
        protocol: "https",
        hostname: "imgs.search.brave.com",
        pathname: "/**"
      }
    ]
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://image.tmdb.org https://assets.fanart.tv https://m.media-amazon.com https://images.unsplash.com https://imgs.search.brave.com",
              "media-src 'self' blob: https:",
              "frame-src 'self' https://vidlink.pro https://embed.su https://www.vidking.net https://vidsrc.me https://vidsrc.to https://vidsrc.xyz https://vidsrc-embed.ru https://vidsrc-embed.su https://vidsrcme.su https://vsrc.su https://dlhd.st https://www.youtube.com https://peachify.pro https://*.dlhd.st",
              "connect-src 'self' https://api.themoviedb.org https:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
