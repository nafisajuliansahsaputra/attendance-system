export type AdminDeviceStatus = "ACTIVE" | "DISABLED" | "REVOKED";
export type AdminDeviceType = "SIMULATOR" | "ARDUINO_BRIDGE" | "ESP32" | "OTHER";
export type AdminDevicePairingStatus = "UNPAIRED" | "WAITING" | "PAIRED" | "REVOKED";
export type AdminDeviceConnectionStatus = "NEVER" | "ONLINE" | "OFFLINE" | "INACTIVE";
export type DevicePairingMode = "PAIR" | "ROTATE";

export interface AdminDeviceDirectoryRow {
  id: string;
  code: string;
  name: string;
  deviceType: AdminDeviceType;
  status: AdminDeviceStatus;
  protocolVersion: string;
  location?: string;
  lastSeenAt?: string;
  lastHeartbeatAt?: string;
  pairedAt?: string;
  credentialRotatedAt?: string;
  secretConfigured: boolean;
  pairingStatus: AdminDevicePairingStatus;
  connectionStatus: AdminDeviceConnectionStatus;
  pairingExpiresAt?: string;
  lastEventAt?: string;
  lastAttendanceAt?: string;
  createdAt: string;
  metadata: Record<string, unknown>;
  pendingTransactions: number;
  recentErrors24h: number;
}

export interface CreateAdminDeviceResult {
  id: string;
  code: string;
  name: string;
  deviceType: AdminDeviceType;
  status: AdminDeviceStatus;
  protocolVersion: string;
  location?: string;
  secretConfigured: boolean;
}

export interface CreateDevicePairingResult {
  pairingSessionId: string;
  deviceId: string;
  mode: DevicePairingMode;
  expiresAt: string;
}

export interface ClaimDevicePairingResult {
  deviceId: string;
  institutionId: string;
  code: string;
  name: string;
  deviceType: AdminDeviceType;
  protocolVersion: string;
  location?: string;
  pairedAt: string;
  credentialRotated: boolean;
}

export interface SetAdminDeviceStatusResult {
  id: string;
  status: AdminDeviceStatus;
  secretConfigured: boolean;
}
