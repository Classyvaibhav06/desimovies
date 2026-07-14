import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

// Hardcoded fallback channels in case the API key is not configured yet
const FALLBACK_CHANNELS = [
  {
    channel_id: "54",
    channel_name: "FIFA 1",
    logo_url: "https://imgs.search.brave.com/hooCbBTnMa_WTRo1DBU9tdIQu05HX8yXN4j-Ee_hhjI/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMjI4/MDU3NzU0OC9waG90/by9rYW5zYXMtY2l0/eS1taXNzb3VyaS1h/LWdlbmVyYWwtdmll/dy1vZi1maWZhLXdv/cmxkLWN1cC0yMDI2/LXNpZ25hZ2UtYXQt/a2Fuc2FzLWNpdHkt/c3RhZGl1bS1vbi5q/cGc_cz02MTJ4NjEy/Jnc9MCZrPTIwJmM9/dVJ4NUFOeHdxSzhx/QW1lR1RXaUJqMUhS/M1IzSF9Ld1RrMllP/RHl3RW1oUT0",
  },
  {
    channel_id: "768",
    channel_name: "FIFA 2",
    logo_url: "https://imgs.search.brave.com/hooCbBTnMa_WTRo1DBU9tdIQu05HX8yXN4j-Ee_hhjI/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMjI4/MDU3NzU0OC9waG90/by9rYW5zYXMtY2l0/eS1taXNzb3VyaS1h/LWdlbmVyYWwtdmll/dy1vZi1maWZhLXdv/cmxkLWN1cC0yMDI2/LXNpZ25hZ2UtYXQt/a2Fuc2FzLWNpdHkt/c3RhZGl1bS1vbi5q/cGc_cz02MTJ4NjEy/Jnc9MCZrPTIwJmM9/dVJ4NUFOeHdxSzhx/QW1lR1RXaUJqMUhS/M1IzSF9Ld1RrMllP/RHl3RW1oUT0",
  },
  {
    channel_id: "350",
    channel_name: "FIFA 3",
    logo_url: "https://imgs.search.brave.com/hooCbBTnMa_WTRo1DBU9tdIQu05HX8yXN4j-Ee_hhjI/rs:fit:500:0:1:0/g:ce/aHR0cHM6Ly9tZWRp/YS5nZXR0eWltYWdl/cy5jb20vaWQvMjI4/MDU3NzU0OC9waG90/by9rYW5zYXMtY2l0/eS1taXNzb3VyaS1h/LWdlbmVyYWwtdmll/dy1vZi1maWZhLXdv/cmxkLWN1cC0yMDI2/LXNpZ25hZ2UtYXQt/a2Fuc2FzLWNpdHkt/c3RhZGl1bS1vbi5q/cGc_cz02MTJ4NjEy/Jnc9MCZrPTIwJmM9/dVJ4NUFOeHdxSzhx/QW1lR1RXaUJqMUhS/M1IzSF9Ld1RrMllP/RHl3RW1oUT0",
  },
  {
    channel_id: "49",
    channel_name: "Sony Ten 3 HD",
    logo_url: "https://images.unsplash.com/photo-1461896836934-ffe607ba8211?q=80&w=800",
  },
  {
    channel_id: "302",
    channel_name: "beIN SPORTS 1",
    logo_url: "https://images.unsplash.com/photo-1540747737956-37872404f80f?q=80&w=800",
  }
];

export async function GET() {
  const apiKey = process.env.DADDYLIVE_API_KEY;

  if (!apiKey) {
    return NextResponse.json({
      success: true,
      isFallback: true,
      channels: FALLBACK_CHANNELS,
      schedule: {},
      message: "Add DADDYLIVE_API_KEY to your env configuration to fetch real-time streams."
    });
  }

  try {
    // 1. Fetch Channels List
    const channelsResponse = await fetch(
      `https://dlhd.st/daddyapi.php?key=${apiKey}&endpoint=channels`,
      { next: { revalidate: 60 } } // Cache channels for 60 seconds
    );

    let channelsData = [];
    if (channelsResponse.ok) {
      channelsData = await channelsResponse.json();
    }

    // 2. Fetch Schedule List
    const scheduleResponse = await fetch(
      `https://dlhd.st/daddyapi.php?key=${apiKey}&endpoint=schedule`,
      { next: { revalidate: 60 } } // Cache schedule for 60 seconds
    );

    let scheduleData = {};
    if (scheduleResponse.ok) {
      const parsedSchedule = await scheduleResponse.json();
      if (parsedSchedule.success && parsedSchedule.data) {
        scheduleData = parsedSchedule.data;
      }
    }

    return NextResponse.json({
      success: true,
      isFallback: false,
      channels: Array.isArray(channelsData) ? channelsData : [],
      schedule: scheduleData
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json(
      { success: false, error: errorMessage, channels: FALLBACK_CHANNELS, schedule: {} },
      { status: 500 }
    );
  }
}
