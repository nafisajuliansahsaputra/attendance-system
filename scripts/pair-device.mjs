import { writeFile } from "node:fs/promises";

const pairingCode = process.env.PAIRING_CODE?.trim();
const apiUrl = process.env.ATTENDANCE_API_URL?.trim()?.replace(/\/$/, "");
const protocolVersion = process.env.DEVICE_PROTOCOL_VERSION?.trim() || "v1";
const envPath = process.env.DEVICE_ENV_PATH?.trim() || ".env.device";

if (!pairingCode || !apiUrl) {
  console.error("Missing PAIRING_CODE or ATTENDANCE_API_URL.");
  process.exit(1);
}

const client = {
  firmwareVersion: process.env.DEVICE_FIRMWARE_VERSION?.trim() || undefined,
  hardwareModel: process.env.DEVICE_HARDWARE_MODEL?.trim() || undefined,
  bridgeVersion: process.env.DEVICE_BRIDGE_VERSION?.trim() || "node-pairing-script-v1",
  serialNumber: process.env.DEVICE_SERIAL_NUMBER?.trim() || undefined,
};

const response = await fetch(`${apiUrl}/api/device/v1/pair`, {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
  },
  body: JSON.stringify({
    pairingCode,
    protocolVersion,
    client,
  }),
});

const payload = await response.json().catch(() => null);

if (!response.ok || !payload?.ok || !payload?.credentials) {
  console.error(
    `Pairing failed: ${payload?.code ?? response.status} ${payload?.message ?? ""}`.trim(),
  );
  process.exit(1);
}

const env = [
  `ATTENDANCE_API_URL=${apiUrl}`,
  `DEVICE_ID=${payload.credentials.deviceId}`,
  `DEVICE_SECRET=${payload.credentials.secret}`,
  `DEVICE_PROTOCOL_VERSION=${payload.credentials.protocolVersion}`,
  "",
].join("\n");

await writeFile(envPath, env, {
  encoding: "utf8",
  mode: 0o600,
});

console.log(`Device paired: ${payload.device.name} (${payload.device.code})`);
console.log(`Credentials stored locally in ${envPath}.`);
console.log("The plaintext device secret is not printed and cannot be recovered from the server.");
