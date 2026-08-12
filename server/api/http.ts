import type { ApiContext, JsonRecord } from "./types";

export function json(data: unknown, status = 200, headers: Record<string, string> = {}): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", ...headers },
  });
}

export function error(code: string, message: string, status: number, details?: JsonRecord): Response {
  return json({ error: { code, message, ...(details ? { details } : {}) } }, status);
}

export async function body(request: Request): Promise<JsonRecord> {
  try {
    const parsed = await request.json();
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as JsonRecord) : {};
  } catch {
    return {};
  }
}

export function bearer(request: Request): string | null {
  const value = request.headers.get("authorization") ?? "";
  return value.startsWith("Bearer ") ? value.slice(7).trim() || null : null;
}

export function requireClient(context: ApiContext): string | Response {
  const token = bearer(context.request);
  if (!token) return error("AUTH_REQUIRED", "Client session is required", 401);
  const session = context.store.sessions.get(token);
  if (!session || session.kind !== "client" || session.expiresAt < Date.now()) {
    return error("AUTH_INVALID", "Client session is invalid or expired", 401);
  }
  return session.subjectId;
}

export function requireCoach(context: ApiContext): true | Response {
  const token = bearer(context.request) ?? context.request.headers.get("x-coach-token");
  const configured = context.env.COACH_TOKEN;
  const devAllowed = (context.env.DEV_MODE === "true" || new URL(context.request.url).hostname === "localhost") && token === "dev-coach";
  // Private Sites owner-only access injects this identity header after the
  // edge has authenticated the visitor. Match it to an explicitly configured
  // owner id; never trust a header on its own or in a public deployment.
  const siteUserId = context.request.headers.get("oai-authenticated-user-id");
  const siteAccessAllowed = Boolean(context.env.COACH_ACCESS_USER_ID && siteUserId && siteUserId === context.env.COACH_ACCESS_USER_ID);
  const tokenAllowed = Boolean(configured && token && token === configured);
  if (!devAllowed && !siteAccessAllowed && !tokenAllowed) {
    return error("COACH_AUTH_REQUIRED", "Coach authentication is required", 401);
  }
  return true;
}

export async function issueSession(context: ApiContext, kind: "client" | "coach", subjectId: string): Promise<string> {
  const token = crypto.randomUUID() + crypto.randomUUID();
  context.store.sessions.set(token, { kind, subjectId, expiresAt: Date.now() + 1000 * 60 * 60 * 12 });
  return token;
}
