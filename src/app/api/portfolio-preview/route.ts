import { readFile } from "node:fs/promises";
import path from "node:path";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const imagePath = path.join(
      process.cwd(),
      "src",
      "assets",
      "portfolio-student-preview-final.webp",
    );

    const image = await readFile(imagePath);

    return new Response(image, {
      status: 200,
      headers: {
        "Content-Type": "image/webp",
        "Cache-Control": "public, max-age=31536000, immutable",
      },
    });
  } catch (error) {
    console.error("Portfolio preview image failed to load", error);

    return new Response("Portfolio preview unavailable", {
      status: 500,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }
}
