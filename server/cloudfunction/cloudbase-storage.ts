import type { SnapshotBackend } from "../api/persistence";

export const RUNTIME_STATE_COLLECTION = "runtime_state";
const STATE_DOC_ID = "single-coach-v1";

/** The subset of the `@cloudbase/node-sdk` database API this adapter uses. */
export type CloudbaseDatabase = {
  collection(name: string): {
    doc(id: string): { get(): Promise<{ data?: unknown }> };
    where(query: Record<string, unknown>): { update(data: Record<string, unknown>): Promise<{ updated?: number }> };
    add(data: Record<string, unknown>): Promise<unknown>;
  };
};

type StoredState = { ciphertext?: unknown; keyVersion?: unknown; revision?: unknown };

function isDuplicateKey(caught: unknown): boolean {
  const record = caught && typeof caught === "object" ? caught as Record<string, unknown> : {};
  const text = `${String(record.code ?? "")} ${String(record.errCode ?? "")} ${String(record.message ?? caught ?? "")}`;
  return /duplicate|E11000/i.test(text);
}

/**
 * Compare-and-set storage for the encrypted snapshot in one CloudBase document.
 * The first write inserts with a fixed `_id` (a concurrent insert fails as a
 * duplicate); later writes update only while `revision` still matches.
 */
export function cloudbaseSnapshotBackend(db: CloudbaseDatabase): SnapshotBackend {
  const collection = () => db.collection(RUNTIME_STATE_COLLECTION);
  return {
    async read() {
      const result = await collection().doc(STATE_DOC_ID).get();
      const data = Array.isArray(result.data) ? result.data[0] : result.data;
      if (!data) return null;
      const state = data as StoredState;
      if (typeof state.ciphertext !== "string" || typeof state.keyVersion !== "string" || typeof state.revision !== "number") {
        throw new Error("Malformed runtime state document");
      }
      return { ciphertext: state.ciphertext, keyVersion: state.keyVersion, revision: state.revision };
    },
    async write(record, expectedRevision) {
      const fields = { ciphertext: record.ciphertext, keyVersion: record.keyVersion, revision: record.revision, updatedAt: new Date().toISOString() };
      if (expectedRevision === 0) {
        try {
          await collection().add({ _id: STATE_DOC_ID, ...fields });
          return "written";
        } catch (caught) {
          if (isDuplicateKey(caught)) return "conflict";
          throw caught;
        }
      }
      const result = await collection().where({ _id: STATE_DOC_ID, revision: expectedRevision }).update(fields);
      return result.updated === 1 ? "written" : "conflict";
    },
  };
}
