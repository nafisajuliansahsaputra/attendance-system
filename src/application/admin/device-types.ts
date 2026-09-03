export type AdminDeviceStatus = "ACTIVE" | "DISABLED" | "REVOKED";
export type AdminDeviceType = "SIMULATOR" | "ARDUINO_BRIDGE" | "ESP32" | "OTHER";

export interface AdminDeviceDirectoryRow {
  id: string;
  code: string;
  name: string;
  deviceType: AdminDeviceType;
  status: AdminDeviceStatus;
  protocolVersion: string;
  lastSeenAt?: string;
  secretConfigured: boolean;
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
  secretConfigured: boolean;
}

export interface SetAdminDeviceStatusResult {
  id: string;
  status: AdminDeviceStatus;
  secretConfigured: boolean;
}
