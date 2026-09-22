const PORTFOLIO_PREVIEW_URL = "https://d2jqrm6oza8nb6.cloudfront.net/datasets/d85573f8-b6c9-4905-8fed-fd3232be52da.jpg?_jwt=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJrZXlIYXNoIjoiMjI2YzNhNTFkN2NiNzgwYiIsImJ1Y2tldCI6InJ1bndheS1kYXRhc2V0cyIsInN0YWdlIjoicHJvZCIsImV4cCI6MTc5MDIyODU2MX0.H7E5BzhzuwXo643QOAfaZP58gO8tpbOUzTe_DXgpmLM";

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
        "Cache-Control": "public, max-age=3600, s-maxage=3600",
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
