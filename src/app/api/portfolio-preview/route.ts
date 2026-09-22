const PORTFOLIO_PREVIEW_URL = "https://d2jqrm6oza8nb6.cloudfront.net/datasets/9f94734e-0cd4-4bb6-bf94-adf2b4615c74.jpg?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiNDlkY2ZhZTI3ZjEzYjVlZSIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5MDE5MTcxNH0.zBN-Dz-55ajbO-NUUVx0mfw2f2kqptOISty29jOHTYY";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const upstream = await fetch(PORTFOLIO_PREVIEW_URL, {
      cache: "no-store",
      redirect: "follow",
    });

    if (!upstream.ok) {
      return new Response("Portfolio preview upstream failed", {
        status: 502,
        headers: {
          "Content-Type": "text/plain; charset=utf-8",
          "Cache-Control": "no-store",
        },
      });
    }

    const bytes = await upstream.arrayBuffer();

    return new Response(bytes, {
      status: 200,
      headers: {
        "Content-Type": upstream.headers.get("content-type") || "image/jpeg",
        "Content-Length": String(bytes.byteLength),
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch (error) {
    console.error("Portfolio preview proxy failed", error);

    return new Response("Portfolio preview unavailable", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}
