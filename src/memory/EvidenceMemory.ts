import type { EvidenceRecord } from "../contracts.js";

export class EvidenceMemory {
  #records: EvidenceRecord[] = [];

  append(record: EvidenceRecord): void {
    this.#records.push(Object.freeze({ ...record, provenance: [...record.provenance] }));
  }

  all(): readonly EvidenceRecord[] {
    return this.#records;
  }

  query(predicate: (record: EvidenceRecord) => boolean): EvidenceRecord[] {
    return this.#records.filter(predicate);
  }

  latest(kind?: string): EvidenceRecord | undefined {
    for (let i = this.#records.length - 1; i >= 0; i -= 1) {
      const record = this.#records[i];
      if (record && (!kind || record.kind === kind)) return record;
    }
    return undefined;
  }
}
