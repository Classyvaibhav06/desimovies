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
              "img-src 'self' data: blob: https://image.tmdb.org https://assets.fanart.tv https://m.media-amazon.com",
              "media-src 'self' blob: https:",
              "frame-src https://vidlink.pro https://embed.su https://www.vidking.net https://vidsrc.me https://vidsrc.to https://vidsrc.xyz https://vidsrc-embed.ru https://vidsrc-embed.su https://vidsrcme.su https://vsrc.su",
              "connect-src 'self' https://api.themoviedb.org https:",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
