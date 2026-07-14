import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Desktop Chrome UA — DaddyLive blocks real mobile UAs
const DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const server = searchParams.get("server") || "watch";
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "Missing channel id" }, { status: 400 });
  }

  const streamUrl = `https://dlhd.st/${server}/stream-${id}.php`;

  try {
    const response = await fetch(streamUrl, {
      headers: {
        "User-Agent": DESKTOP_UA,
        Referer: "https://dlhd.st/",
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        "Cache-Control": "no-cache",
      },
      // No caching — streams are live
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: `Upstream error: ${response.status}` },
        { status: response.status }
      );
    }

    let html = await response.text();

    // Rewrite relative URLs to absolute dlhd.st URLs so they resolve correctly
    // when the page is served from our own domain
    html = html
      .replace(/(src|href)=["']\//g, `$1="https://dlhd.st/`)
      .replace(/url\(\//g, "url(https://dlhd.st/");

    return new Response(html, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        // Allow the browser to iframe this from our own origin
        "X-Frame-Options": "SAMEORIGIN",
        // No caching for live streams
        "Cache-Control": "no-store, no-cache",
      },
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
