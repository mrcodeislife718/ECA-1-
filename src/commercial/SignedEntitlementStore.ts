import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { createHash, verify } from "node:crypto";
import type { Entitlement } from "./LicensingEngine.js";

export type SignedEntitlementDocument = {
  version: 1;
  issuedAt: number;
  keyId: string;
  entitlements: Entitlement[];
  signatureBase64: string;
};

export class SignedEntitlementStore {
  private readonly trustedKeys = new Map<string, string>();

  constructor(private readonly filePath: string) {
    if (!filePath.trim()) throw new Error("filePath is required");
  }

  trustKey(keyId: string, publicKeyPem: string): void {
    if (!keyId.trim() || !publicKeyPem.trim()) throw new Error("trusted key fields are required");
    this.trustedKeys.set(keyId, publicKeyPem);
  }

  async load(): Promise<Entitlement[]> {
    const raw = await readFile(this.filePath, "utf8");
    const document = JSON.parse(raw) as SignedEntitlementDocument;
    this.verify(document);
    return document.entitlements.map((item) => ({ ...item, features: [...item.features], ...(item.metadata ? { metadata: structuredClone(item.metadata) } : {}) }));
  }

  async writeVerified(document: SignedEntitlementDocument): Promise<void> {
    this.verify(document);
    await mkdir(dirname(this.filePath), { recursive: true });
    const temp = `${this.filePath}.tmp-${process.pid}-${Date.now()}`;
    await writeFile(temp, `${JSON.stringify(document)}\n`, { encoding: "utf8", mode: 0o600 });
    await rename(temp, this.filePath);
  }

  verify(document: SignedEntitlementDocument): void {
    if (document.version !== 1) throw new Error(`Unsupported entitlement document version: ${document.version}`);
    const publicKey = this.trustedKeys.get(document.keyId);
    if (!publicKey) throw new Error(`Untrusted entitlement key: ${document.keyId}`);
    const payload = this.payload(document);
    const signature = Buffer.from(document.signatureBase64, "base64");
    if (!verify(null, payload, publicKey, signature)) throw new Error("Entitlement signature verification failed");
  }

  digest(document: SignedEntitlementDocument): string {
    return createHash("sha256").update(this.payload(document)).digest("hex");
  }

  private payload(document: SignedEntitlementDocument): Buffer {
    return Buffer.from(JSON.stringify({
      version: document.version,
      issuedAt: document.issuedAt,
      keyId: document.keyId,
      entitlements: document.entitlements
    }), "utf8");
  }
}
