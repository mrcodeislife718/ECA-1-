import { randomBytes, verify } from "node:crypto";

export type DeviceIdentity = {
  deviceId: string;
  publicKeyPem: string;
  keyId: string;
  enrolledAt: number;
  revokedAt?: number;
};

export type DeviceChallenge = {
  deviceId: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
};

export class DeviceIdentityRegistry {
  private readonly devices = new Map<string, DeviceIdentity>();
  private readonly challenges = new Map<string, DeviceChallenge>();

  enroll(identity: DeviceIdentity): void {
    if (!identity.deviceId.trim() || !identity.keyId.trim() || !identity.publicKeyPem.trim()) throw new Error("device identity fields are required");
    const existing = this.devices.get(identity.deviceId);
    if (existing && existing.keyId !== identity.keyId) throw new Error(`Device identity already enrolled: ${identity.deviceId}`);
    this.devices.set(identity.deviceId, { ...identity });
  }

  revoke(deviceId: string, revokedAt = Date.now()): void {
    const current = this.devices.get(deviceId);
    if (!current) throw new Error(`Unknown device: ${deviceId}`);
    this.devices.set(deviceId, { ...current, revokedAt });
  }

  challenge(deviceId: string, ttlMs = 30_000, now = Date.now()): DeviceChallenge {
    const identity = this.devices.get(deviceId);
    if (!identity) throw new Error(`Unknown device: ${deviceId}`);
    if (identity.revokedAt !== undefined) throw new Error(`Device revoked: ${deviceId}`);
    if (!Number.isFinite(ttlMs) || ttlMs <= 0) throw new RangeError("ttlMs must be positive");
    const challenge = { deviceId, nonce: randomBytes(32).toString("hex"), issuedAt: now, expiresAt: now + ttlMs };
    this.challenges.set(challenge.nonce, challenge);
    return { ...challenge };
  }

  authenticate(deviceId: string, nonce: string, signature: Uint8Array, now = Date.now()): boolean {
    const identity = this.devices.get(deviceId);
    const challenge = this.challenges.get(nonce);
    if (!identity || !challenge) return false;
    if (identity.revokedAt !== undefined || challenge.deviceId !== deviceId || challenge.expiresAt <= now) return false;
    const payload = Buffer.from(`${challenge.deviceId}:${challenge.nonce}:${challenge.issuedAt}:${challenge.expiresAt}`, "utf8");
    const ok = verify(null, payload, identity.publicKeyPem, signature);
    if (ok) this.challenges.delete(nonce);
    return ok;
  }

  get(deviceId: string): DeviceIdentity | undefined {
    const found = this.devices.get(deviceId);
    return found ? { ...found } : undefined;
  }
}
