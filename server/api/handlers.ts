import { consentTypes, isConsentType, requiredConsents, requiresManualReview } from "../../packages/contracts/src/index";
import { exerciseCatalogById, foodCatalogById } from "../../packages/catalogs/src/index";
import { PLAN_SCHEMA_VERSION, PLAN_TIMEZONE } from "../../packages/plan-schema/src/index";
import { validateProviderPayload } from "./plan-validation";
import { body, error, issueSession, json, requireClient, requireCoach } from "./http";
import { audit, checkinKey, id, nowIso, randomToken, recordOpenedDay, sha256 } from "./store";
import { encryptSecret } from "./persistence";
import type { ApiContext, ClientRecord, ConsentType, HealthProfile, JsonRecord } from "./types";

function requestId(request: Request): string {
  return request.headers.get("x-request-id") ?? id("req");
}

function safeString(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value.trim() : fallback;
}

function localToday(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function isCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

function addCalendarDays(value: string, offset: number): string {
  const date = new Date(`${value}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + offset);
  return date.toISOString().slice(0, 10);
}

function clientView(client: ClientRecord): JsonRecord {
  return { id: client.id, displayName: client.displayName, status: client.status, createdAt: client.createdAt };
}

function parseProfile(input: JsonRecord): HealthProfile | null {
  const allowedTargets = new Set(["fat_loss", "muscle_gain", "general_fitness"]);
  const allowedAge = new Set(["18_24", "25_34", "35_44", "45_54", "55_plus"]);
  const allowedExperience = new Set(["beginner", "intermediate", "advanced"]);
  const stringArray = (value: unknown) => Array.isArray(value) && value.every((item) => typeof item === "string" && item.length < 80) ? value as string[] : [];
  if (!allowedTargets.has(String(input.target)) || !allowedAge.has(String(input.ageBand)) || !allowedExperience.has(String(input.trainingExperience))) return null;
  if (typeof input.heightCm !== "number" || input.heightCm < 120 || input.heightCm > 230) return null;
  if (typeof input.weightKg !== "number" || input.weightKg < 30 || input.weightKg > 250) return null;
  if (typeof input.sessionsPerWeek !== "number" || !Number.isInteger(input.sessionsPerWeek) || input.sessionsPerWeek < 1 || input.sessionsPerWeek > 7) return null;
  if (typeof input.minutesPerSession !== "number" || !Number.isInteger(input.minutesPerSession) || input.minutesPerSession < 15 || input.minutesPerSession > 180) return null;
  const riskFlags = stringArray(input.riskFlags);
  const injuryFlags = stringArray(input.injuryFlags);
  const allergyFlags = stringArray(input.allergyFlags);
  return {
    target: input.target as HealthProfile["target"], ageBand: input.ageBand as HealthProfile["ageBand"], heightCm: input.heightCm, weightKg: input.weightKg,
    trainingExperience: input.trainingExperience as HealthProfile["trainingExperience"], sessionsPerWeek: input.sessionsPerWeek, minutesPerSession: input.minutesPerSession,
    equipment: stringArray(input.equipment), injuryFlags, allergyFlags, dietaryPreferences: stringArray(input.dietaryPreferences), riskFlags, timezone: PLAN_TIMEZONE,
  };
}

function hasManualRisk(profile: HealthProfile): boolean {
  return requiresManualReview(profile);
}

function currentPlan(store: ApiContext["store"], clientId: string, date: string) {
  const plans = [...store.plans.values()].filter((plan) => plan.clientId === clientId && plan.status !== "archived" && plan.effectiveFrom <= date && (!plan.effectiveTo || plan.effectiveTo > date));
  return plans.sort((a, b) => b.versionNo - a.versionNo)[0] ?? null;
}

function clientDayView(day: NonNullable<ReturnType<typeof currentPlan>>["payload"]["days"][number]) {
  return {
    ...day,
    exercises: day.exercises.map((exercise) => {
      const catalogEntry = exerciseCatalogById.get(exercise.catalogId);
      return {
        ...exercise,
        name: catalogEntry?.name ?? exercise.catalogId,
        target: catalogEntry?.target ?? "",
        equipment: catalogEntry?.equipment ?? "",
        unit: catalogEntry?.unit ?? "reps",
        pattern: catalogEntry?.pattern ?? null,
        cues: exercise.cues?.length ? exercise.cues : (catalogEntry?.cues ?? []),
        steps: catalogEntry?.steps ?? [],
        mediaPath: catalogEntry?.mediaPath ?? null,
        mediaAttribution: catalogEntry?.mediaAttribution ?? null,
      };
    }),
    meals: day.meals.map((meal) => ({
      ...meal,
      foods: meal.foods.map((food) => ({
        ...food,
        name: foodCatalogById.get(food.foodCatalogId)?.name ?? food.foodCatalogId,
        unit: foodCatalogById.get(food.foodCatalogId)?.unit ?? "g",
        kcal: foodCatalogById.has(food.foodCatalogId) ? Math.round((foodCatalogById.get(food.foodCatalogId)!.kcalPer100g * food.grams) / 100) : 0,
      })),
      mealKcal: meal.foods.reduce((sum, food) => sum + (foodCatalogById.has(food.foodCatalogId) ? Math.round((foodCatalogById.get(food.foodCatalogId)!.kcalPer100g * food.grams) / 100) : 0), 0),
    })),
    dailyKcal: day.meals.reduce((sum, meal) => sum + meal.foods.reduce((mealSum, food) => mealSum + (foodCatalogById.has(food.foodCatalogId) ? Math.round((foodCatalogById.get(food.foodCatalogId)!.kcalPer100g * food.grams) / 100) : 0), 0), 0),
  };
}

function clientDayCheckins(store: ApiContext["store"], clientId: string, planId: string, localDate: string) {
  return [...store.checkins.values()]
    .filter((checkin) => checkin.clientId === clientId && checkin.planDayId === `${planId}:${localDate}` && checkin.status === "completed")
    .map((checkin) => ({ itemId: checkin.itemId, itemType: checkin.itemType, status: checkin.status }));
}

export async function handleApi(context: ApiContext): Promise<Response> {
  const url = new URL(context.request.url);
  const path = url.pathname.replace(/^\/api\/?/, "").replace(/\/$/, "");
  const method = context.request.method.toUpperCase();
  const reqId = requestId(context.request);
  try {
    if (path === "health" && method === "GET") return json({ ok: true, service: "fit-plan-api", mode: context.env.DB ? "d1" : "memory" });
    if (path === "wx/auth/login" && method === "POST") return await wxLogin(context, reqId);
    if (path === "invitations/accept" && method === "POST") return await acceptInvitation(context, reqId);
    if (path === "coach/session" && method === "POST") return await coachSession(context, reqId);
    if (path === "coach/invitations" && method === "POST") return await createInvitation(context, reqId);
    if (path === "coach/clients" && method === "GET") return listClients(context);
    if (path === "me" && method === "GET") return clientMe(context);
    if (path === "me/profile" && method === "PUT") return saveProfile(context, reqId);
    if (path === "me/consents" && method === "POST") return saveConsents(context, reqId);
    const revokeConsentMatch = path.match(/^me\/consents\/([^/]+)$/);
    if (revokeConsentMatch && method === "DELETE") return revokeConsent(context, revokeConsentMatch[1], reqId);
    if (path === "reminders/subscribe" && method === "POST") return subscribeReminders(context, reqId);
    if (path === "plan/today" && method === "GET") return clientToday(context, reqId);
    if (path === "plans/calendar" && method === "GET") return clientCalendar(context);
    if (path === "checkins" && method === "PUT") return saveCheckin(context, reqId);
    if (path === "wellness-feedback" && method === "PUT") return saveWellness(context, reqId);
    if (path === "me" && method === "DELETE") return requestDeletion(context, reqId);
    const profileMatch = path.match(/^coach\/clients\/([^/]+)\/profile$/);
    if (profileMatch && method === "GET") return coachProfile(context, profileMatch[1]);
    const summaryMatch = path.match(/^coach\/clients\/([^/]+)\/summary$/);
    if (summaryMatch && method === "GET") return coachSummary(context, summaryMatch[1]);
    const planVersionsMatch = path.match(/^coach\/clients\/([^/]+)\/plan-versions$/);
    if (planVersionsMatch && method === "GET") return coachPlanVersions(context, planVersionsMatch[1]);
    const profileConfirmMatch = path.match(/^coach\/clients\/([^/]+)\/profile\/confirm$/);
    if (profileConfirmMatch && method === "POST") return confirmProfile(context, profileConfirmMatch[1], reqId);
    const generationMatch = path.match(/^coach\/clients\/([^/]+)\/plan-generations$/);
    if (generationMatch && method === "POST") return createGeneration(context, generationMatch[1], reqId);
    const jobMatch = path.match(/^coach\/generation-jobs\/([^/]+)$/);
    if (jobMatch && method === "GET") return generationStatus(context, jobMatch[1]);
    const fallbackTokenMatch = path.match(/^coach\/generation-jobs\/([^/]+)\/codex-fallback-token$/);
    if (fallbackTokenMatch && method === "POST") return createFallbackToken(context, fallbackTokenMatch[1], reqId);
    const fallbackInputMatch = path.match(/^coach\/generation-jobs\/([^/]+)\/codex-input$/);
    if (fallbackInputMatch && method === "GET") return codexInput(context, fallbackInputMatch[1]);
    const draftMatch = path.match(/^coach\/plan-drafts\/([^/]+)$/);
    if (draftMatch && method === "PATCH") return updateDraft(context, draftMatch[1], reqId);
    if (draftMatch && method === "GET") return getDraft(context, draftMatch[1]);
    const draftRejectMatch = path.match(/^coach\/plan-drafts\/([^/]+)\/reject$/);
    if (draftRejectMatch && method === "POST") return rejectDraft(context, draftRejectMatch[1], reqId);
    const draftPublishMatch = path.match(/^coach\/plan-drafts\/([^/]+)\/publish$/);
    if (draftPublishMatch && method === "POST") return publishDraft(context, draftPublishMatch[1], reqId);
    const alertsAckMatch = path.match(/^coach\/alerts\/([^/]+)\/ack$/);
    if (alertsAckMatch && method === "POST") return acknowledgeAlert(context, alertsAckMatch[1], reqId);
    if (path === "coach/alerts" && method === "GET") return listAlerts(context);
    if (path === "codex-fallback/import" && method === "POST") return importCodexFallback(context, reqId);
    return error("NOT_FOUND", "API route not found", 404);
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : "Unexpected API error";
    audit(context.store, "api.error", { requestId: reqId, code: "INTERNAL_ERROR" });
    return error("INTERNAL_ERROR", context.env.DEV_MODE === "true" ? message : "Unexpected API error", 500);
  }
}

async function wxLogin(context: ApiContext, reqId: string): Promise<Response> {
  const input = await body(context.request);
  const code = safeString(input.code);
  const platform = context.platform;
  let openid = platform ? platform.openid : context.env.DEV_MODE === "true" ? safeString(input.devOpenid) : "";
  const isLocalDevelopment = !platform && context.env.DEV_MODE === "true";
  if (!platform && context.env.WECHAT_APP_ID && context.env.WECHAT_APP_SECRET && code) {
    const wxUrl = new URL("https://api.weixin.qq.com/sns/jscode2session");
    wxUrl.searchParams.set("appid", context.env.WECHAT_APP_ID);
    wxUrl.searchParams.set("secret", context.env.WECHAT_APP_SECRET);
    wxUrl.searchParams.set("js_code", code);
    wxUrl.searchParams.set("grant_type", "authorization_code");
    const response = await fetch(wxUrl);
    const payload = await response.json() as { openid?: string; errcode?: number };
    if (!response.ok || !payload.openid) return error("WECHAT_LOGIN_FAILED", "WeChat login failed", 401);
    openid = payload.openid;
  }
  if (!openid || (!platform && !code && context.env.DEV_MODE !== "true")) return error("WECHAT_LOGIN_REQUIRED", "WeChat login code is required", 400);
  const openidHash = platform ? platform.openidHash : await sha256(openid);
  const existing = context.store.clients.get(context.store.authByOpenId.get(openidHash) ?? "");
  const requestedClientId = isLocalDevelopment ? safeString(input.devClientId) : "";
  const invitationToken = safeString(input.invitationToken);
  const invitationHash = invitationToken ? await sha256(invitationToken) : null;
  const invitation = invitationHash ? [...context.store.invitations.values()].find((candidate) => candidate.tokenHash === invitationHash) : null;
  if (isLocalDevelopment && input.devOpenid !== undefined) {
    const expectedOpenId = requestedClientId ? `openid-local-sandbox:${requestedClientId}` : "";
    if (!requestedClientId || !invitation || invitation.clientId !== requestedClientId || !invitation.consumedAt || openid !== expectedOpenId) {
      return error("INVITATION_INVALID", "Local development identity must match the consumed invitation", 403);
    }
  }
  if (!requestedClientId && !existing && !invitation) return error("INVITATION_REQUIRED", "A consumed invitation must be supplied for first login", 403);
  const invitedClient = invitation ? context.store.clients.get(invitation.clientId) : null;
  if (existing && invitation && existing.id !== invitation.clientId) return error("INVITATION_INVALID", "Invitation does not belong to this client", 403);
  if (requestedClientId && invitation && requestedClientId !== invitation.clientId) return error("INVITATION_INVALID", "Invitation does not belong to this client", 403);
  if (invitation?.openidHash && invitation.openidHash !== openidHash) return error("INVITATION_INVALID", "Invitation is already bound to another client identity", 403);
  const client = (requestedClientId ? context.store.clients.get(requestedClientId) : null) ?? existing ?? invitedClient;
  if (invitation && (!invitation.consumedAt || invitation.revokedAt || invitation.expiresAt <= nowIso())) return error("INVITATION_INVALID", "Invitation is invalid or expired", 403);
  if (!client) return error("INVITATION_REQUIRED", "An invitation is required before login", 403);
  if (invitation && !invitation.openidHash) invitation.openidHash = openidHash;
  // Platform callers are re-identified on every call; a bearer session would be an unused second credential.
  const token = platform ? null : await issueSession(context, "client", client.id);
  context.store.authByOpenId.set(openidHash, client.id);
  if (context.env.DATA_ENCRYPTION_KEY) context.store.authOpenIdCiphertext.set(client.id, await encryptSecret(openid, context.env.DATA_ENCRYPTION_KEY));
  audit(context.store, "client.auth.bound", { requestId: reqId, clientId: client.id, openidHash });
  return json(token ? { sessionToken: token, client: clientView(client) } : { client: clientView(client) });
}

async function acceptInvitation(context: ApiContext, reqId: string): Promise<Response> {
  const input = await body(context.request);
  const token = safeString(input.token);
  if (!token) return error("INVITATION_INVALID", "Invitation token is required", 400);
  const tokenHash = await sha256(token);
  const invitation = [...context.store.invitations.values()].find((candidate) => candidate.tokenHash === tokenHash);
  if (!invitation || invitation.revokedAt || invitation.expiresAt <= nowIso()) return error("INVITATION_INVALID", "Invitation is invalid or expired", 400);
  const client = context.store.clients.get(invitation.clientId);
  if (!client) return error("NOT_FOUND", "Client not found", 404);
  if (invitation.consumedAt) {
    if (invitation.openidHash) return error("INVITATION_INVALID", "Invitation is no longer available", 400);
    if (["onboarding", "pending_profile_review"].includes(client.status)) {
      audit(context.store, "invitation.reopened", { requestId: reqId, clientId: client.id });
      return json({ client: clientView(client) });
    }
    return error("INVITATION_INVALID", "Invitation is no longer available", 400);
  }
  invitation.consumedAt = nowIso(); client.status = "onboarding";
  audit(context.store, "invitation.accepted", { requestId: reqId, clientId: client.id });
  return json({ client: clientView(client) });
}

async function coachSession(context: ApiContext, reqId: string): Promise<Response> {
  const auth = requireCoach(context); if (auth !== true) return auth;
  const token = await issueSession(context, "coach", "coach_single");
  audit(context.store, "coach.login", { requestId: reqId, actor: "coach" });
  return json({ sessionToken: token });
}

async function createInvitation(context: ApiContext, reqId: string): Promise<Response> {
  const auth = requireCoach(context); if (auth !== true) return auth;
  const input = await body(context.request);
  const displayName = safeString(input.displayName);
  if (!displayName || displayName.length > 40) return error("INVALID_INPUT", "displayName is required", 400);
  const client = { id: id("client"), displayName, status: "invited" as const, createdAt: nowIso() };
  const rawToken = randomToken();
  const record = { id: id("invite"), clientId: client.id, tokenHash: await sha256(rawToken), openidHash: null, expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 48).toISOString(), consumedAt: null, revokedAt: null };
  context.store.clients.set(client.id, client); context.store.invitations.set(record.id, record);
  audit(context.store, "invitation.created", { requestId: reqId, clientId: client.id, actor: "coach" });
  return json({ invitation: { id: record.id, expiresAt: record.expiresAt, token: rawToken, client: clientView(client) } }, 201);
}

function listClients(context: ApiContext): Response {
  const auth = requireCoach(context); if (auth !== true) return auth;
  return json({ clients: [...context.store.clients.values()].map(clientView) });
}

function clientMe(context: ApiContext): Response {
  const clientId = requireClient(context); if (clientId instanceof Response) return clientId;
  const client = context.store.clients.get(clientId); if (!client) return error("NOT_FOUND", "Client not found", 404);
  return json({ client: clientView(client), profile: context.store.profiles.get(clientId) ?? null, consents: [...(context.store.consents.get(clientId) ?? [])] });
}

async function saveProfile(context: ApiContext, reqId: string): Promise<Response> {
  const clientId = requireClient(context); if (clientId instanceof Response) return clientId;
  const profile = parseProfile(await body(context.request));
  if (!profile) return error("INVALID_INPUT", "Profile fields are invalid", 400);
  const client = context.store.clients.get(clientId); if (!client) return error("NOT_FOUND", "Client not found", 404);
  context.store.profiles.set(clientId, profile); client.status = "pending_profile_review";
  audit(context.store, "profile.saved", { requestId: reqId, clientId });
  return json({ ok: true, status: client.status });
}

async function saveConsents(context: ApiContext, reqId: string): Promise<Response> {
  const clientId = requireClient(context); if (clientId instanceof Response) return clientId;
  const input = await body(context.request);
  const values = Array.isArray(input.types) ? input.types.filter(isConsentType) : [];
  if (!values.length) return error("INVALID_INPUT", `types must include one of ${consentTypes.join(", ")}`, 400);
  const textVersion = safeString(input.textVersion, "consent.v1");
  if (textVersion !== "consent.v1") return error("INVALID_INPUT", "Unsupported consent text version", 400);
  const acceptedAt = nowIso();
  const current = context.store.consents.get(clientId) ?? new Set<ConsentType>();
  const records = context.store.consentRecords.get(clientId) ?? new Map();
  values.forEach((value) => { current.add(value); records.set(value, { type: value, textVersion, acceptedAt, revokedAt: null }); });
  context.store.consents.set(clientId, current); context.store.consentRecords.set(clientId, records);
  audit(context.store, "consent.granted", { requestId: reqId, clientId, types: values, textVersion, acceptedAt });
  return json({ consents: [...current], modelReady: requiredConsents(current) });
}

async function revokeConsent(context: ApiContext, rawType: string, reqId: string): Promise<Response> {
  const clientId = requireClient(context); if (clientId instanceof Response) return clientId;
  if (!isConsentType(rawType)) return error("INVALID_INPUT", "Unknown consent type", 400);
  const type = rawType as ConsentType;
  const current = context.store.consents.get(clientId) ?? new Set<ConsentType>();
  current.delete(type); context.store.consents.set(clientId, current);
  const records = context.store.consentRecords.get(clientId) ?? new Map();
  const record = records.get(type); if (record) record.revokedAt = nowIso();
  context.store.consentRecords.set(clientId, records);
  if (type === "subscription_message") for (const subscription of context.store.subscriptions.values()) if (subscription.clientId === clientId) subscription.revokedAt = nowIso();
  audit(context.store, "consent.revoked", { requestId: reqId, clientId, type, revokedAt: nowIso() });
  return json({ consents: [...current], modelReady: requiredConsents(current) });
}

async function subscribeReminders(context: ApiContext, reqId: string): Promise<Response> {
  const clientId = requireClient(context); if (clientId instanceof Response) return clientId;
  const input = await body(context.request);
  const templateId = safeString(input.templateId, context.env.WECHAT_TEMPLATE_ID ?? "");
  if (!templateId || templateId.length > 120) return error("INVALID_INPUT", "templateId is required", 400);
  const consents = context.store.consents.get(clientId) ?? new Set();
  if (!consents.has("subscription_message")) return error("CONSENT_REQUIRED", "Subscription message consent is required", 403);
  const record = { id: id("subscription"), clientId, templateId, consentAt: nowIso(), revokedAt: null };
  context.store.subscriptions.set(record.id, record);
  audit(context.store, "reminder.subscription_saved", { requestId: reqId, clientId, templateId });
  return json({ subscription: { id: record.id, templateId: record.templateId, consentAt: record.consentAt } }, 201);
}

function coachProfile(context: ApiContext, clientId: string): Response {
  const auth = requireCoach(context); if (auth !== true) return auth;
  const client = context.store.clients.get(clientId); if (!client) return error("NOT_FOUND", "Client not found", 404);
  return json({ client: clientView(client), profile: context.store.profiles.get(clientId) ?? null, consents: [...(context.store.consents.get(clientId) ?? [])] });
}

async function confirmProfile(context: ApiContext, clientId: string, reqId: string): Promise<Response> {
  const auth = requireCoach(context); if (auth !== true) return auth;
  const client = context.store.clients.get(clientId); const profile = context.store.profiles.get(clientId); const consents = context.store.consents.get(clientId) ?? new Set();
  if (!client || !profile) return error("PROFILE_INCOMPLETE", "Client profile is incomplete", 400);
  if (!requiredConsents(consents)) return error("CONSENT_REQUIRED", "Required consent is missing", 400);
  client.status = hasManualRisk(profile) ? "pending_profile_review" : "active";
  audit(context.store, "profile.confirmed", { requestId: reqId, clientId, safetyGate: hasManualRisk(profile) ? "manual" : "auto_allowed" });
  return json({ client: clientView(client), safetyGate: hasManualRisk(profile) ? "manual" : "auto_allowed" });
}

async function createGeneration(context: ApiContext, clientId: string, reqId: string): Promise<Response> {
  const auth = requireCoach(context); if (auth !== true) return auth;
  const client = context.store.clients.get(clientId); const profile = context.store.profiles.get(clientId); const consents = context.store.consents.get(clientId) ?? new Set();
  if (!client || !profile) return error("PROFILE_INCOMPLETE", "Client profile is incomplete", 400);
  if (!requiredConsents(consents)) return error("CONSENT_REQUIRED", "Required consent is missing", 400);
  if (hasManualRisk(profile)) return error("RISK_MANUAL_REVIEW", "This profile requires manual coach handling", 409);
  const input = await body(context.request); const startDate = safeString(input.startDate, localToday());
  if (!isCalendarDate(startDate)) return error("INVALID_INPUT", "startDate must be YYYY-MM-DD", 400);
  const idempotencyKey = context.request.headers.get("idempotency-key")?.trim() || null;
  if (idempotencyKey) {
    const existingAudit = context.store.audit.find((event) => (event.action === "generation.local_requested" || event.action === "generation.queued") && event.clientId === clientId && event.idempotencyKey === idempotencyKey);
    const existingJobId = typeof existingAudit?.jobId === "string" ? existingAudit.jobId : null;
    const existingJob = existingJobId ? context.store.jobs.get(existingJobId) : null;
    if (existingJob) return json({ job: existingJob }, 202);
  }
  const job = { id: id("job"), clientId, provider: "codex_cli" as const, model: "codex-cli", schemaVersion: PLAN_SCHEMA_VERSION, status: "awaiting_local" as const, errorCode: null, traceId: id("trace"), startDate, outputHash: null, createdAt: nowIso(), updatedAt: nowIso(), operator: "coach" as const };
  context.store.jobs.set(job.id, job);
  audit(context.store, "generation.local_requested", { requestId: reqId, clientId, jobId: job.id, provider: job.provider, idempotencyKey, startDate, operator: "coach" });
  return json({ job }, 202);
}

export async function runGeneration(context: ApiContext, jobId: string, startDate: string): Promise<void> {
  const job = context.store.jobs.get(jobId); if (!job) return;
  if (!["queued", "running"].includes(job.status)) return;
  job.provider = "codex_cli";
  job.model = "codex-cli";
  job.status = "awaiting_local";
  job.errorCode = null;
  job.updatedAt = nowIso();
  audit(context.store, "generation.awaiting_local", { clientId: job.clientId, jobId, traceId: job.traceId, startDate, provider: "codex_cli" });
}

function generationStatus(context: ApiContext, jobId: string): Response {
  const auth = requireCoach(context); if (auth !== true) return auth;
  const job = context.store.jobs.get(jobId); if (!job) return error("NOT_FOUND", "Generation job not found", 404);
  const draft = [...context.store.drafts.values()].find((item) => item.generationJobId === jobId);
  return json({ job, draft: draft ? { id: draft.id, status: draft.status, validation: draft.validation, createdAt: draft.createdAt } : null });
}

async function createFallbackToken(context: ApiContext, jobId: string, reqId: string): Promise<Response> {
  const auth = requireCoach(context); if (auth !== true) return auth;
  const job = context.store.jobs.get(jobId);
  if (!job || !["awaiting_local", "failed"].includes(job.status)) return error("FALLBACK_NOT_ALLOWED", "Codex CLI handoff is not available for this job", 409);
  const existing = [...context.store.fallbackTokens.values()].find((item) => item.jobId === jobId && !item.consumedAt && item.expiresAt > nowIso());
  if (existing) return error("FALLBACK_TOKEN_ALREADY_ISSUED", "A fallback token is already active", 409);
  const rawToken = randomToken();
  const record = { tokenHash: await sha256(rawToken), jobId, clientId: job.clientId, expiresAt: new Date(Date.now() + 15 * 60 * 1000).toISOString(), consumedAt: null };
  context.store.fallbackTokens.set(record.tokenHash, record);
  audit(context.store, "generation.fallback_token_issued", { requestId: reqId, jobId, clientId: job.clientId, expiresAt: record.expiresAt, actor: "coach" });
  return json({ token: rawToken, expiresAt: record.expiresAt, jobId }, 201);
}

function codexInput(context: ApiContext, jobId: string): Response {
  const auth = requireCoach(context); if (auth !== true) return auth;
  const job = context.store.jobs.get(jobId); const profile = job ? context.store.profiles.get(job.clientId) : null;
  if (!job || !profile || !["awaiting_local", "failed"].includes(job.status)) return error("FALLBACK_NOT_ALLOWED", "Codex input is not available for this job", 409);
  return json({ job: { id: job.id, clientId: job.clientId, startDate: job.startDate, schemaVersion: job.schemaVersion }, profile: {
    target: profile.target, ageBand: profile.ageBand, heightCm: profile.heightCm, weightKg: profile.weightKg,
    trainingExperience: profile.trainingExperience, sessionsPerWeek: profile.sessionsPerWeek, minutesPerSession: profile.minutesPerSession,
    equipment: profile.equipment, injuryFlags: profile.injuryFlags, allergyFlags: profile.allergyFlags, dietaryPreferences: profile.dietaryPreferences,
    timezone: profile.timezone,
  } });
}

async function importCodexFallback(context: ApiContext, reqId: string): Promise<Response> {
  const input = await body(context.request);
  const rawToken = safeString(input.token);
  if (!rawToken) return error("FALLBACK_TOKEN_INVALID", "Fallback token is required", 400);
  const tokenHash = await sha256(rawToken);
  const token = context.store.fallbackTokens.get(tokenHash);
  if (!token || token.consumedAt || token.expiresAt <= nowIso()) return error("FALLBACK_TOKEN_INVALID", "Fallback token is invalid or expired", 401);
  const job = context.store.jobs.get(token.jobId);
  const profile = context.store.profiles.get(token.clientId);
  if (!job || !profile) return error("NOT_FOUND", "Fallback job or profile not found", 404);
  const validation = validateProviderPayload(profile, input.payload);
  if (!validation.ok) {
    audit(context.store, "generation.fallback_rejected", { requestId: reqId, jobId: job.id, clientId: job.clientId, reason: validation.errors.slice(0, 5) });
    return error("VALIDATION_FAILED", "Fallback payload failed the same plan safety validator", 422, { reasons: validation.errors.slice(0, 5) });
  }
  token.consumedAt = nowIso();
  job.provider = "codex_cli"; job.status = "pending_review"; job.updatedAt = nowIso(); job.outputHash = await sha256(JSON.stringify(validation.value));
  const draft = { id: id("draft"), generationJobId: job.id, clientId: job.clientId, status: "pending_review" as const, payload: validation.value, validation: { ok: true as const, warnings: validation.warnings }, createdAt: nowIso(), reviewedAt: null, rejectionReason: null };
  context.store.drafts.set(draft.id, draft);
  audit(context.store, "generation.fallback_draft_ready", { requestId: reqId, jobId: job.id, clientId: job.clientId, draftId: draft.id, outputHash: job.outputHash, provider: "codex_cli" });
  return json({ draft: { id: draft.id, status: draft.status, validation: draft.validation }, job: { id: job.id, status: job.status, provider: job.provider } }, 201);
}

function getDraft(context: ApiContext, draftId: string): Response {
  const auth = requireCoach(context); if (auth !== true) return auth;
  const draft = context.store.drafts.get(draftId); if (!draft) return error("DRAFT_NOT_FOUND", "Draft not found", 404);
  return json({ draft });
}

async function updateDraft(context: ApiContext, draftId: string, reqId: string): Promise<Response> {
  const auth = requireCoach(context); if (auth !== true) return auth;
  const draft = context.store.drafts.get(draftId);
  if (!draft || draft.status !== "pending_review") return error("DRAFT_NOT_FOUND", "Pending draft not found", 404);
  const profile = context.store.profiles.get(draft.clientId);
  if (!profile) return error("PROFILE_INCOMPLETE", "Client profile is incomplete", 400);
  const input = await body(context.request);
  const validation = validateProviderPayload(profile, input.payload);
  if (!validation.ok) {
    audit(context.store, "draft.update_rejected", { requestId: reqId, draftId, clientId: draft.clientId, reason: validation.errors.slice(0, 5), actor: "coach" });
    return error("VALIDATION_FAILED", "Edited draft failed the same plan safety validator", 422, { reasons: validation.errors.slice(0, 5) });
  }
  draft.payload = validation.value;
  draft.validation = { ok: true, warnings: validation.warnings };
  const job = context.store.jobs.get(draft.generationJobId);
  if (job) {
    job.outputHash = await sha256(JSON.stringify(validation.value));
    job.updatedAt = nowIso();
  }
  audit(context.store, "draft.updated", { requestId: reqId, draftId, clientId: draft.clientId, outputHash: job?.outputHash ?? null, actor: "coach" });
  return json({ draft });
}

async function rejectDraft(context: ApiContext, draftId: string, reqId: string): Promise<Response> {
  const auth = requireCoach(context); if (auth !== true) return auth;
  const draft = context.store.drafts.get(draftId); if (!draft) return error("DRAFT_NOT_FOUND", "Draft not found", 404);
  const input = await body(context.request); draft.status = "rejected"; draft.rejectionReason = safeString(input.reason, "Coach rejected draft"); draft.reviewedAt = nowIso();
  const job = context.store.jobs.get(draft.generationJobId); if (job) job.status = "rejected";
  audit(context.store, "draft.rejected", { requestId: reqId, draftId, clientId: draft.clientId, actor: "coach" });
  return json({ draft: { id: draft.id, status: draft.status, rejectionReason: draft.rejectionReason } });
}

async function publishDraft(context: ApiContext, draftId: string, reqId: string): Promise<Response> {
  const auth = requireCoach(context); if (auth !== true) return auth;
  const draft = context.store.drafts.get(draftId); if (!draft || draft.status !== "pending_review") return error("DRAFT_NOT_FOUND", "Pending draft not found", 404);
  const client = context.store.clients.get(draft.clientId); if (!client) return error("NOT_FOUND", "Client not found", 404);
  const input = await body(context.request); const effectiveFrom = safeString(input.effectiveFrom, draft.payload.startDate); const changeReason = safeString(input.changeReason, "Initial coach-approved plan");
  if (!isCalendarDate(effectiveFrom)) return error("INVALID_INPUT", "effectiveFrom must be YYYY-MM-DD", 400);
  const existing = [...context.store.plans.values()].filter((plan) => plan.clientId === draft.clientId && plan.status !== "archived").sort((a, b) => b.versionNo - a.versionNo)[0];
  if (existing && effectiveFrom <= existing.effectiveFrom) return error("CONFLICT", "Future version must start after current version", 409);
  if (existing && effectiveFrom < localToday()) return error("CONFLICT", "Future version cannot start before today", 409);
  if (existing && existing.effectiveTo === null) existing.effectiveTo = effectiveFrom;
  if (existing) existing.status = "superseded";
  const plan = { id: id("plan"), clientId: draft.clientId, versionNo: (existing?.versionNo ?? 0) + 1, effectiveFrom, effectiveTo: null, payload: draft.payload, status: "published" as const, approvedAt: nowIso(), changeReason };
  context.store.plans.set(plan.id, plan); draft.status = "approved"; draft.reviewedAt = nowIso(); const job = context.store.jobs.get(draft.generationJobId); if (job) job.status = "published"; client.status = "active";
  audit(context.store, "plan.published", { requestId: reqId, draftId, planId: plan.id, clientId: draft.clientId, planHash: job?.outputHash, effectiveFrom, actor: "coach" });
  return json({ plan: { id: plan.id, clientId: plan.clientId, versionNo: plan.versionNo, effectiveFrom: plan.effectiveFrom, status: plan.status } }, 201);
}

function clientToday(context: ApiContext, reqId: string): Response {
  const clientId = requireClient(context); if (clientId instanceof Response) return clientId;
  const url = new URL(context.request.url); const date = safeString(url.searchParams.get("date"), localToday());
  audit(context.store, "client.today_viewed", { requestId: reqId, clientId, localDate: date });
  // An opened day is the day the client opened the app, not the plan date they browsed to.
  recordOpenedDay(context.store, clientId, localToday());
  const plan = currentPlan(context.store, clientId, date);
  if (!plan) return json({ status: "waiting_for_coach", date, plan: null, checkins: [] });
  const day = plan.payload.days.find((item) => item.localDate === date) ?? null;
  return json({ status: day ? "ready" : "waiting_for_coach", date, plan: day ? { id: plan.id, versionNo: plan.versionNo, day: clientDayView(day) } : null, checkins: day ? clientDayCheckins(context.store, clientId, plan.id, date) : [] });
}

function coachSummary(context: ApiContext, clientId: string): Response {
  const auth = requireCoach(context); if (auth !== true) return auth;
  const client = context.store.clients.get(clientId); if (!client) return error("NOT_FOUND", "Client not found", 404);
  const url = new URL(context.request.url);
  const requestedDays = Number(url.searchParams.get("days") ?? 7);
  const days = Number.isInteger(requestedDays) && requestedDays >= 1 && requestedDays <= 30 ? requestedDays : 7;
  const dates = new Set<string>();
  context.store.openedDays.forEach((item) => { if (item.clientId === clientId) dates.add(item.localDate); });
  context.store.checkins.forEach((item) => { if (item.clientId === clientId) dates.add(item.localDate); });
  context.store.feedback.forEach((item) => { if (item.clientId === clientId) dates.add(item.localDate); });
  context.store.alerts.forEach((item) => { if (item.clientId === clientId) dates.add(item.localDate); });
  const orderedDates = [...dates].sort();
  const endDate = orderedDates.at(-1);
  const windowDates = new Set(endDate ? Array.from({ length: days }, (_, index) => addCalendarDays(endDate, index - days + 1)).filter((date) => dates.has(date)) : []);
  const checkins = [...context.store.checkins.values()].filter((item) => item.clientId === clientId && windowDates.has(item.localDate) && item.status === "completed");
  const feedbackDays = new Set([...context.store.feedback.values()].filter((item) => item.clientId === clientId && windowDates.has(item.localDate)).map((item) => item.localDate));
  const painAlerts = [...context.store.alerts.values()].filter((item) => item.clientId === clientId && windowDates.has(item.localDate) && item.type === "pain");
  const summary = {
    openedDays: [...context.store.openedDays.values()].filter((item) => item.clientId === clientId && windowDates.has(item.localDate)).length,
    trainingCheckins: checkins.filter((item) => item.itemType === "exercise").length,
    mealCheckins: checkins.filter((item) => item.itemType === "meal").length,
    waterCheckins: checkins.filter((item) => item.itemType === "water").length,
    painAlerts: painAlerts.length,
    feedbackDays: feedbackDays.size,
  };
  return json({ client: clientView(client), days, summary, alerts: painAlerts.map((alert) => ({ ...alert, clientName: client.displayName })) });
}

function coachPlanVersions(context: ApiContext, clientId: string): Response {
  const auth = requireCoach(context); if (auth !== true) return auth;
  const client = context.store.clients.get(clientId); if (!client) return error("NOT_FOUND", "Client not found", 404);
  const versions = [...context.store.plans.values()]
    .filter((plan) => plan.clientId === clientId && plan.status !== "archived")
    .sort((a, b) => a.versionNo - b.versionNo)
    .map((plan) => ({ id: plan.id, versionNo: plan.versionNo, effectiveFrom: plan.effectiveFrom, effectiveTo: plan.effectiveTo, status: plan.status, approvedAt: plan.approvedAt, changeReason: plan.changeReason }));
  return json({ client: clientView(client), versions });
}

/** A day with only walking or stretching is a recovery day, even though it has moves. */
function isRecoveryDay(exercises: Array<{ catalogId: string }>): boolean {
  return exercises.every((exercise) => ["walk", "stretch"].includes(exerciseCatalogById.get(exercise.catalogId)?.pattern ?? ""));
}

function clientCalendar(context: ApiContext): Response {
  const clientId = requireClient(context); if (clientId instanceof Response) return clientId;
  const url = new URL(context.request.url); const month = safeString(url.searchParams.get("month"), localToday().slice(0, 7));
  const days = [...context.store.plans.values()]
    .filter((item) => item.clientId === clientId && item.status !== "archived")
    .flatMap((item) => item.payload.days.filter((day) => day.localDate.startsWith(month) && item.effectiveFrom <= day.localDate && (!item.effectiveTo || item.effectiveTo > day.localDate)).map((day) => ({ versionNo: item.versionNo, date: day.localDate, title: day.title, hasTraining: day.exercises.length > 0, kind: isRecoveryDay(day.exercises) ? "recovery" : "training", mealCount: day.meals.length })))
    .sort((a, b) => a.date.localeCompare(b.date) || b.versionNo - a.versionNo)
    .filter((day, index, all) => index === all.findIndex((candidate) => candidate.date === day.date));
  return json({ month, days });
}

async function saveCheckin(context: ApiContext, reqId: string): Promise<Response> {
  const clientId = requireClient(context); if (clientId instanceof Response) return clientId;
  const input = await body(context.request); const localDate = safeString(input.localDate); const itemId = safeString(input.itemId); const itemType = input.itemType;
  if (!localDate || !itemId || !["exercise", "meal", "water"].includes(String(itemType)) || !["completed", "not_completed"].includes(String(input.status))) return error("INVALID_INPUT", "localDate, itemId, itemType and status are required", 400);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(localDate)) return error("INVALID_INPUT", "localDate must be YYYY-MM-DD", 400);
  const plan = currentPlan(context.store, clientId, localDate);
  const day = plan?.payload.days.find((candidate) => candidate.localDate === localDate);
  if (!plan || !day) return error("PLAN_NOT_FOUND", "There is no published plan for this date", 409);
  const planDayId = safeString(input.planDayId, `${plan.id}:${localDate}`);
  if (planDayId !== `${plan.id}:${localDate}`) return error("INVALID_INPUT", "planDayId does not match the published plan day", 400);
  const validItem = itemType === "exercise" ? day.exercises.some((item) => item.catalogId === itemId) : itemType === "meal" ? day.meals.some((item) => item.mealType === itemId) : itemId === "water";
  if (!validItem) return error("INVALID_INPUT", "itemId is not part of the published plan day", 400);
  const record = { clientId, planDayId, localDate, itemId, itemType: itemType as "exercise" | "meal" | "water", status: input.status as "completed" | "not_completed", completedAt: input.status === "completed" ? nowIso() : null };
  context.store.checkins.set(checkinKey(clientId, itemId, localDate), record); audit(context.store, "checkin.saved", { requestId: reqId, clientId, itemId, localDate, itemType });
  return json({ checkin: record });
}

async function saveWellness(context: ApiContext, reqId: string): Promise<Response> {
  const clientId = requireClient(context); if (clientId instanceof Response) return clientId;
  const input = await body(context.request); const localDate = safeString(input.localDate, localToday());
  if (!["none", "present"].includes(String(input.pain)) || !["low", "normal", "good"].includes(String(input.energy)) || !["low", "normal", "high"].includes(String(input.hunger))) return error("INVALID_INPUT", "pain, energy and hunger are required", 400);
  const feedback = { clientId, localDate, pain: input.pain as "none" | "present", energy: input.energy as "low" | "normal" | "good", hunger: input.hunger as "low" | "normal" | "high" };
  context.store.feedback.set(`${clientId}:${localDate}`, feedback); let alert: unknown = null;
  if (feedback.pain === "present") { const existing = [...context.store.alerts.values()].find((item) => item.clientId === clientId && item.localDate === localDate && item.type === "pain"); alert = existing ?? { id: id("alert"), clientId, localDate, type: "pain" as const, status: "open" as const, createdAt: nowIso(), acknowledgedAt: null }; if (!existing) context.store.alerts.set((alert as { id: string }).id, alert as never); }
  audit(context.store, "wellness.saved", { requestId: reqId, clientId, localDate, pain: feedback.pain }); return json({ feedback, alert });
}

async function acknowledgeAlert(context: ApiContext, alertId: string, reqId: string): Promise<Response> {
  const auth = requireCoach(context); if (auth !== true) return auth; const alert = context.store.alerts.get(alertId); if (!alert) return error("NOT_FOUND", "Alert not found", 404); alert.status = "acknowledged"; alert.acknowledgedAt = nowIso(); audit(context.store, "alert.acknowledged", { requestId: reqId, alertId, actor: "coach" }); return json({ alert });
}

function listAlerts(context: ApiContext): Response { const auth = requireCoach(context); if (auth !== true) return auth; return json({ alerts: [...context.store.alerts.values()].sort((a, b) => b.createdAt.localeCompare(a.createdAt)) }); }

async function requestDeletion(context: ApiContext, reqId: string): Promise<Response> {
  const clientId = requireClient(context); if (clientId instanceof Response) return clientId;
  const client = context.store.clients.get(clientId); if (!client) return error("NOT_FOUND", "Client not found", 404);
  const existing = [...context.store.deletionRequests.values()].find((item) => item.clientId === clientId && item.status === "requested");
  if (existing) return json({ status: "deletion_pending", receipt: existing.id, purgeAt: existing.purgeAt }, 202);
  const requestedAt = nowIso();
  const purgeAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30).toISOString();
  const receiptHash = await sha256(`${clientId}:${requestedAt}:${purgeAt}`);
  const record = { id: id("deletion"), clientId, requestedAt, purgeAt, receiptHash, status: "requested" as const };
  context.store.deletionRequests.set(record.id, record); client.status = "deletion_pending";
  audit(context.store, "deletion.requested", { requestId: reqId, clientId, deletionRequestId: record.id, purgeAt, receiptHash, actor: "client" });
  return json({ status: client.status, receipt: record.id, purgeAt, message: "Data deletion is scheduled after the 30-day recovery window" }, 202);
}
