import { createHash, verify } from "node:crypto";

export type SignedUpdate = {
  version: string;
  artifact: Uint8Array;
  sha256: string;
  signature: Uint8Array;
  keyId: string;
};

export type InstalledVersion = {
  version: string;
  installedAt: number;
  sha256: string;
};

export class SignedUpdateManager {
  private readonly trustedKeys = new Map<string, string>();
  private readonly history: InstalledVersion[] = [];

  trustKey(keyId: string, publicKeyPem: string): void {
    if (!keyId.trim()) throw new Error("keyId is required");
    this.trustedKeys.set(keyId, publicKeyPem);
  }

  verify(update: SignedUpdate): void {
    const publicKey = this.trustedKeys.get(update.keyId);
    if (!publicKey) throw new Error(`Untrusted update key: ${update.keyId}`);

    const digest = createHash("sha256").update(update.artifact).digest("hex");
    if (digest !== update.sha256.toLowerCase()) {
      throw new Error("Update artifact digest mismatch");
    }

    const signedPayload = Buffer.from(`${update.version}:${digest}`, "utf8");
    if (!verify(null, signedPayload, publicKey, update.signature)) {
      throw new Error("Update signature verification failed");
    }
  }

  install(update: SignedUpdate, installedAt = Date.now()): InstalledVersion {
    this.verify(update);
    const installed = { version: update.version, installedAt, sha256: update.sha256.toLowerCase() };
    this.history.push(installed);
    return { ...installed };
  }

  current(): InstalledVersion | undefined {
    const item = this.history.at(-1);
    return item ? { ...item } : undefined;
  }

  rollbackTarget(): InstalledVersion | undefined {
    if (this.history.length < 2) return undefined;
    const item = this.history.at(-2);
    return item ? { ...item } : undefined;
  }

  installations(): InstalledVersion[] {
    return this.history.map((item) => ({ ...item }));
  }
}
