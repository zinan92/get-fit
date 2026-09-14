import { purgeClient } from "./persistence";
import type { Store } from "./types";

/** Clears clients whose 30-day deletion window has ended. Returns how many requests were executed. */
export async function purgeDueDeletions(store: Store, now = Date.now()): Promise<number> {
  let executed = 0;
  for (const request of store.deletionRequests.values()) {
    if (request.status === "requested" && Date.parse(request.purgeAt) <= now) {
      if (request.clientId) await purgeClient(store, request.clientId);
      request.status = "purged";
      store.audit.push({ id: `audit_purge_${request.id}`, actor: "system", action: "deletion.executed", at: new Date(now).toISOString(), requestId: request.id });
      executed += 1;
    }
  }
  return executed;
}
