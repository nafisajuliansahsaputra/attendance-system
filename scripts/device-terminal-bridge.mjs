import { randomUUID } from "node:crypto";
import http from "node:http";
import readline from "node:readline";

const apiUrl = process.env.ATTENDANCE_API_URL?.trim()?.replace(/\/$/, "");
const deviceId = process.env.DEVICE_ID?.trim();
const deviceSecret = process.env.DEVICE_SECRET?.trim();
const protocolVersion = process.env.DEVICE_PROTOCOL_VERSION?.trim() || "v1";
const host = process.env.DEVICE_BRIDGE_HOST?.trim() || "127.0.0.1";
const port = Number(process.env.DEVICE_BRIDGE_PORT || "8765");

if (!apiUrl || !deviceId || !deviceSecret) {
  console.error(
    "Missing ATTENDANCE_API_URL, DEVICE_ID, or DEVICE_SECRET. Pair the device first.",
  );
  process.exit(1);
}

if (!Number.isInteger(port) || port < 1024 || port > 65535) {
  console.error("DEVICE_BRIDGE_PORT must be an integer between 1024 and 65535.");
  process.exit(1);
}

const apiOrigin = new URL(apiUrl).origin;
const allowedOrigins = new Set([
  apiOrigin,
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  ...(process.env.TERMINAL_ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean),
]);

const startedAt = new Date().toISOString();
let sequence = 0;
let busy = false;
let serverOnline = false;
let deviceAuthorized = false;
let faceServiceConfigured = false;
let lastHeartbeatAt = null;
let lastServerTime = null;
let lastError = null;
let device = null;
const events = [];

function authHeaders() {
  return {
    Authorization: `Bearer ${deviceSecret}`,
    "X-Device-Id": deviceId,
    "X-Protocol-Version": protocolVersion,
    "Content-Type": "application/json",
  };
}

function rememberEvent(type, payload) {
  const event = {
    seq: ++sequence,
    type,
    at: new Date().toISOString(),
    payload,
  };
  events.push(event);
  if (events.length > 100) events.splice(0, events.length - 100);
  return event;
}

function bridgeStatus() {
  return {
    ok: true,
    bridgeVersion: "1.0.0",
    startedAt,
    serverOnline,
    deviceAuthorized,
    faceServiceConfigured,
    busy,
    queueDepth: 0,
    lastHeartbeatAt,
    lastServerTime,
    lastError,
    device,
    reader: {
      keyboardWedgeSupported: true,
      localAdapterEndpoint: "/scan",
      stdinSupported: true,
    },
  };
}

function originHeaders(request) {
  const origin = request.headers.origin;
  if (!origin) {
    return {
      "Access-Control-Allow-Origin": "*",
      Vary: "Origin",
    };
  }

  if (!allowedOrigins.has(origin)) return null;

  return {
    "Access-Control-Allow-Origin": origin,
    Vary: "Origin",
  };
}

function sendJson(response, status, payload, headers = {}) {
  const body = JSON.stringify(payload);
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-store",
    ...headers,
  });
  response.end(body);
}

async function readJson(request, limit = 3_200_000) {
  const chunks = [];
  let size = 0;

  for await (const chunk of request) {
    size += chunk.length;
    if (size > limit) {
      throw new Error("REQUEST_TOO_LARGE");
    }
    chunks.push(chunk);
  }

  if (chunks.length === 0) return {};
  return JSON.parse(Buffer.concat(chunks).toString("utf8"));
}

async function fetchJson(pathname, init = {}) {
  try {
    const response = await fetch(`${apiUrl}${pathname}`, {
      ...init,
      cache: "no-store",
      signal: AbortSignal.timeout(12_000),
    });
    const payload = await response.json().catch(() => ({}));

    serverOnline = true;
    lastError = null;

    if (response.status === 401) {
      deviceAuthorized = false;
    }

    return { response, payload };
  } catch (error) {
    serverOnline = false;
    lastError = error instanceof Error ? error.message : "NETWORK_ERROR";
    throw error;
  }
}

async function heartbeat() {
  try {
    const uptimeSeconds = Math.max(
      0,
      Math.floor((Date.now() - new Date(startedAt).getTime()) / 1000),
    );
    const { response, payload } = await fetchJson("/api/device/v1/heartbeat", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        bridgeVersion: "node-local-bridge-v1",
        queueDepth: 0,
        uptimeSeconds,
        localTime: new Date().toISOString(),
      }),
    });

    if (!response.ok || !payload?.ok) {
      deviceAuthorized = response.status !== 401 ? deviceAuthorized : false;
      lastError = payload?.code || `HEARTBEAT_${response.status}`;
      return;
    }

    deviceAuthorized = true;
    lastHeartbeatAt = payload.lastHeartbeatAt || new Date().toISOString();
    lastServerTime = payload.serverTime || null;
    device = payload.device || device;

    const healthResponse = await fetch(`${apiUrl}/api/health`, {
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    }).catch(() => null);

    if (healthResponse?.ok) {
      const health = await healthResponse.json().catch(() => null);
      faceServiceConfigured = Boolean(health?.readiness?.faceServiceConfigured);
    }
  } catch {
    deviceAuthorized = false;
  }
}

async function processScan(rfidUid, source = "local") {
  const uid = String(rfidUid || "").trim().toUpperCase();

  if (!uid || uid.length > 128) {
    throw new Error("INVALID_RFID_UID");
  }
  if (busy) {
    throw new Error("DEVICE_BUSY");
  }

  busy = true;
  const requestId = `rfid-${randomUUID()}`;
  const occurredAt = new Date().toISOString();
  rememberEvent("card-reading", { requestId, rfidUid: uid, source, occurredAt });

  try {
    const { response, payload } = await fetchJson("/api/device/v1/card-scan", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        requestId,
        rfidUid: uid,
        occurredAt,
      }),
    });

    if (response.status === 401) deviceAuthorized = false;
    const event = rememberEvent("card-result", {
      requestId,
      rfidUid: uid,
      source,
      httpStatus: response.status,
      ...payload,
    });

    return event;
  } catch (error) {
    const event = rememberEvent("bridge-error", {
      requestId,
      rfidUid: uid,
      source,
      code: "SERVER_UNREACHABLE",
      message: error instanceof Error ? error.message : "NETWORK_ERROR",
    });
    return event;
  } finally {
    busy = false;
  }
}

async function verifyFace(body) {
  if (busy) {
    throw new Error("DEVICE_BUSY");
  }

  const requestId = String(body?.requestId || "").trim();
  const verificationTransactionId = String(
    body?.verificationTransactionId || "",
  ).trim();
  const imageBase64 = String(body?.imageBase64 || "");

  if (
    requestId.length < 8 ||
    !verificationTransactionId ||
    imageBase64.length < 16 ||
    imageBase64.length > 3_000_000
  ) {
    throw new Error("INVALID_FACE_REQUEST");
  }

  busy = true;
  try {
    const { response, payload } = await fetchJson("/api/device/v1/face-verify", {
      method: "POST",
      headers: authHeaders(),
      body: JSON.stringify({
        requestId,
        verificationTransactionId,
        imageBase64,
      }),
    });

    if (response.status === 401) deviceAuthorized = false;
    rememberEvent("face-result", {
      requestId,
      verificationTransactionId,
      httpStatus: response.status,
      ...payload,
    });

    return { status: response.status, payload };
  } finally {
    busy = false;
  }
}

const server = http.createServer(async (request, response) => {
  const cors = originHeaders(request);
  if (!cors) {
    sendJson(response, 403, { ok: false, code: "ORIGIN_NOT_ALLOWED" });
    return;
  }

  const baseHeaders = {
    ...cors,
    "Access-Control-Allow-Private-Network": "true",
  };

  if (request.method === "OPTIONS") {
    response.writeHead(204, {
      ...baseHeaders,
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
      "Access-Control-Max-Age": "600",
    });
    response.end();
    return;
  }

  const url = new URL(request.url || "/", `http://${host}:${port}`);

  try {
    if (request.method === "GET" && (url.pathname === "/" || url.pathname === "/status")) {
      sendJson(response, 200, bridgeStatus(), baseHeaders);
      return;
    }

    if (request.method === "GET" && url.pathname === "/events") {
      const after = Number(url.searchParams.get("after") || "0");
      const safeAfter = Number.isFinite(after) ? Math.max(0, Math.floor(after)) : 0;
      sendJson(
        response,
        200,
        {
          ok: true,
          latestSeq: sequence,
          events: events.filter((event) => event.seq > safeAfter),
        },
        baseHeaders,
      );
      return;
    }

    if (request.method === "POST" && url.pathname === "/scan") {
      const body = await readJson(request, 4096);
      const event = await processScan(body.rfidUid, body.source || "http");
      sendJson(response, 200, { ok: true, event }, baseHeaders);
      return;
    }

    if (request.method === "POST" && url.pathname === "/face-verify") {
      const body = await readJson(request);
      const result = await verifyFace(body);
      sendJson(response, result.status, result.payload, baseHeaders);
      return;
    }

    if (request.method === "POST" && url.pathname === "/heartbeat") {
      await heartbeat();
      sendJson(response, 200, bridgeStatus(), baseHeaders);
      return;
    }

    sendJson(response, 404, { ok: false, code: "NOT_FOUND" }, baseHeaders);
  } catch (error) {
    const message = error instanceof Error ? error.message : "BRIDGE_ERROR";
    const status =
      message === "DEVICE_BUSY"
        ? 409
        : message === "REQUEST_TOO_LARGE"
          ? 413
          : 400;
    sendJson(response, status, { ok: false, code: message }, baseHeaders);
  }
});

server.listen(port, host, () => {
  console.log(
    `Attendance terminal bridge listening on http://${host}:${port}`,
  );
  console.log(
    "Device credentials remain in the local bridge process and are never sent to the browser.",
  );
  void heartbeat();
});

const heartbeatTimer = setInterval(() => {
  void heartbeat();
}, 30_000);
heartbeatTimer.unref();

const stdin = readline.createInterface({
  input: process.stdin,
  terminal: false,
});

stdin.on("line", (line) => {
  const trimmed = line.trim();
  if (!trimmed) return;
  const uid = trimmed.replace(/^RFID\s*[:=]\s*/i, "").trim();
  if (!uid) return;
  void processScan(uid, "stdin").catch((error) => {
    console.error(
      `RFID stdin scan failed: ${error instanceof Error ? error.message : "UNKNOWN"}`,
    );
  });
});

function shutdown() {
  clearInterval(heartbeatTimer);
  stdin.close();
  server.close(() => process.exit(0));
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
