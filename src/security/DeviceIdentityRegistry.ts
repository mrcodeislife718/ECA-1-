import { randomBytes, verify } from "node:crypto";

export type DeviceIdentity = {
  deviceId: string;
  publicKeyPem: string;
  keyId: string;
  enrolledAt: number;
  rotatedAt?: number;
  revokedAt?: number;
};

export type DeviceChallenge = {
  deviceId: string;
  nonce: string;
  issuedAt: number;
  expiresAt: number;
};

export type DeviceKeyRotationRequest = {
  deviceId: string;
  currentKeyId: string;
  newKeyId: string;
  newPublicKeyPem: string;
  issuedAt: number;
  signature: Uint8Array;
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

  rotateKey(request: DeviceKeyRotationRequest, maxAgeMs = 60_000, now = Date.now()): DeviceIdentity {
    const current = this.devices.get(request.deviceId);
    if (!current) throw new Error(`Unknown device: ${request.deviceId}`);
    if (current.revokedAt !== undefined) throw new Error(`Device revoked: ${request.deviceId}`);
    if (request.currentKeyId !== current.keyId) throw new Error("device-key-rotation-current-key-mismatch");
    if (!request.newKeyId.trim() || !request.newPublicKeyPem.trim()) throw new Error("new device key fields are required");
    if (request.newKeyId === current.keyId) throw new Error("device-key-rotation-key-id-not-advanced");
    if (!Number.isFinite(request.issuedAt) || request.issuedAt > now || now - request.issuedAt > maxAgeMs) {
      throw new Error("device-key-rotation-request-expired");
    }
    const payload = Buffer.from(
      `rotate:${request.deviceId}:${request.currentKeyId}:${request.newKeyId}:${request.issuedAt}:${request.newPublicKeyPem}`,
      "utf8"
    );
    if (!verify(null, payload, current.publicKeyPem, request.signature)) throw new Error("device-key-rotation-proof-invalid");
    const rotated = { ...current, keyId: request.newKeyId, publicKeyPem: request.newPublicKeyPem, rotatedAt: now };
    this.devices.set(request.deviceId, rotated);
    for (const [nonce, challenge] of this.challenges) {
      if (challenge.deviceId === request.deviceId) this.challenges.delete(nonce);
    }
    return { ...rotated };
  }

  revoke(deviceId: string, revokedAt = Date.now()): void {
    const current = this.devices.get(deviceId);
    if (!current) throw new Error(`Unknown device: ${deviceId}`);
    this.devices.set(deviceId, { ...current, revokedAt });
    for (const [nonce, challenge] of this.challenges) {
      if (challenge.deviceId === deviceId) this.challenges.delete(nonce);
    }
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
