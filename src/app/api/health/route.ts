export function GET() {
  return Response.json({
    status: "ok",
    service: "attendance-system-web",
    version: "0.1.0",
    architecture: "hardware-ready",
  });
}
