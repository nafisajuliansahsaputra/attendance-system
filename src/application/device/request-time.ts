export const MAX_DEVICE_SCAN_AGE_MS = 10 * 60 * 1000;
export const MAX_DEVICE_SCAN_FUTURE_MS = 2 * 60 * 1000;

export type DeviceScanTimeValidation =
  | { ok: true }
  | { ok: false; reason: "INVALID_TIMESTAMP" | "TOO_OLD" | "TOO_FAR_IN_FUTURE" };

export function validateDeviceScanTime(
  occurredAt: string,
  serverNowMs = Date.now(),
): DeviceScanTimeValidation {
  const occurredAtMs = Date.parse(occurredAt);

  if (Number.isNaN(occurredAtMs)) {
    return { ok: false, reason: "INVALID_TIMESTAMP" };
  }

  if (serverNowMs - occurredAtMs > MAX_DEVICE_SCAN_AGE_MS) {
    return { ok: false, reason: "TOO_OLD" };
  }

  if (occurredAtMs - serverNowMs > MAX_DEVICE_SCAN_FUTURE_MS) {
    return { ok: false, reason: "TOO_FAR_IN_FUTURE" };
  }

  return { ok: true };
}
