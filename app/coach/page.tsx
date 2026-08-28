"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import "./coach.css";

type Client = { id: string; displayName: string; status: string; createdAt: string };
type Job = { id: string; status: string; errorCode: string | null; traceId: string };
type DraftExercise = { catalogId: string; sets: number; reps: number; restSeconds: number; cues?: string[] };
type DraftFood = { foodCatalogId: string; grams: number };
type DraftMeal = { mealType: "breakfast" | "lunch" | "snack" | "dinner"; foods: DraftFood[]; note?: string };
type DraftDay = { dayIndex: number; localDate: string; title: string; exercises: DraftExercise[]; meals: DraftMeal[]; reminders: string[] };
type DraftPayload = { schemaVersion: string; timezone: string; startDate: string; days: DraftDay[] };
type Draft = { id: string; status: string; payload: DraftPayload; validation?: { ok: boolean; warnings: string[] } };
type CoachAlert = { id: string; clientId: string; clientName?: string; localDate: string; type: string; status: string; createdAt: string; acknowledgedAt: string | null };
type CoachSummary = { openedDays: number; trainingCheckins: number; mealCheckins: number; waterCheckins: number; painAlerts: number; feedbackDays: number };
type PlanVersion = { id: string; versionNo: number; effectiveFrom: string; effectiveTo: string | null; status: string; approvedAt: string; changeReason: string | null };

const jobStatusLabels: Record<string, string> = {
  awaiting_local: "等待本机 Codex",
  pending_review: "等待审核",
  published: "已发布",
  rejected: "已退回",
  failed: "失败",
};

const exerciseLabels: Record<string, string> = {
  "ex-goblet-squat": "高脚杯深蹲",
  "ex-dumbbell-row": "单臂哑铃划船",
  "ex-glute-bridge": "臀桥",
  "ex-walk": "快走",
};

const foodLabels: Record<string, string> = {
  "food-egg": "水煮蛋",
  "food-yogurt": "原味酸奶",
  "food-toast": "全麦吐司",
  "food-chicken": "鸡胸肉",
  "food-rice": "糙米饭",
  "food-broccoli": "西兰花",
  "food-banana": "香蕉",
  "food-salmon": "三文鱼",
  "food-sweet-potato": "红薯",
  "food-spinach": "菠菜",
  "food-milk": "低脂牛奶",
  "food-almond": "巴旦木",
};

const mealLabels: Record<DraftMeal["mealType"], string> = {
  breakfast: "早餐",
  lunch: "午餐",
  snack: "下午加餐",
  dinner: "晚餐",
};

function shanghaiToday() {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

async function api(path: string, options: RequestInit = {}, token = "") {
  const response = await fetch(`/api/${path}`, {
    ...options,
    headers: { "content-type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) },
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data?.error?.message || "请求失败");
  return data;
}

export default function CoachPage() {
  const [token, setToken] = useState(() => typeof window === "undefined" ? "" : localStorage.getItem("fit_plan_coach_session") || "");
  const [coachToken, setCoachToken] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [selected, setSelected] = useState<Client | null>(null);
  const [profile, setProfile] = useState<Record<string, unknown> | null>(null);
  const [invitation, setInvitation] = useState<string | null>(null);
  const [job, setJob] = useState<Job | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [fallback, setFallback] = useState<{ token: string; input: string } | null>(null);
  const [summary, setSummary] = useState<CoachSummary | null>(null);
  const [alerts, setAlerts] = useState<CoachAlert[]>([]);
  const [versions, setVersions] = useState<PlanVersion[]>([]);
  const [effectiveFrom, setEffectiveFrom] = useState("");
  const [message, setMessage] = useState("先登录教练后台");

  const ready = Boolean(token);
  const selectedStatus = useMemo(() => selected?.status.replaceAll("_", " ") || "请选择客户", [selected]);

  async function login() {
    try { const data = await api("coach/session", { method: "POST" }, coachToken); localStorage.setItem("fit_plan_coach_session", data.sessionToken); setToken(data.sessionToken); setMessage("已登录"); await loadClients(data.sessionToken); }
    catch (error) { setMessage(error instanceof Error ? error.message : "登录失败"); }
  }

  async function loadClients(auth = token) {
    try { const data = await api("coach/clients", {}, auth); setClients(data.clients); if (!selected && data.clients[0]) await selectClient(data.clients[0], auth); }
    catch (error) { setMessage(error instanceof Error ? error.message : "客户加载失败"); }
  }

  async function selectClient(client: Client, auth = token) {
    setSelected(client);
    try {
      const [profileData, summaryData, versionData] = await Promise.all([
        api(`coach/clients/${client.id}/profile`, {}, auth),
        api(`coach/clients/${client.id}/summary?days=7`, {}, auth),
        api(`coach/clients/${client.id}/plan-versions`, {}, auth),
      ]);
      setProfile(profileData.profile);
      setSummary(summaryData.summary);
      setAlerts(summaryData.alerts || []);
      setVersions(versionData.versions || []);
    } catch (error) { setMessage(error instanceof Error ? error.message : "资料加载失败"); }
  }

  async function createInvite() {
    const name = window.prompt("客户显示名（不要填写身份证、手机号等敏感信息）", "新客户"); if (!name) return;
    try { const data = await api("coach/invitations", { method: "POST", body: JSON.stringify({ displayName: name }) }, token); setInvitation(data.invitation.token); setMessage("邀请已创建；口令只展示一次"); await loadClients(); } catch (error) { setMessage(error instanceof Error ? error.message : "创建失败"); }
  }

  async function confirmProfile() {
    if (!selected) return; try { await api(`coach/clients/${selected.id}/profile/confirm`, { method: "POST" }, token); setMessage("资料已确认"); await loadClients(); } catch (error) { setMessage(error instanceof Error ? error.message : "确认失败"); }
  }

  async function generate() {
    if (!selected) return; try { const data = await api(`coach/clients/${selected.id}/plan-generations`, { method: "POST", body: JSON.stringify({ startDate: shanghaiToday() }) }, token); setJob(data.job); setDraft(null); setFallback(null); setEffectiveFrom(""); setMessage("已创建本机 Codex CLI 任务；客户端不会看到草案"); pollJob(data.job.id); } catch (error) { setMessage(error instanceof Error ? error.message : "生成失败"); }
  }

  async function pollJob(jobId: string) {
    const data = await api(`coach/generation-jobs/${jobId}`, {}, token); setJob(data.job); if (data.draft) { const detail = await api(`coach/plan-drafts/${data.draft.id}`, {}, token); setDraft(detail.draft as Draft); setEffectiveFrom(detail.draft.payload.startDate); setMessage("草案已生成，等待教练审核"); return; } if (["queued", "running"].includes(data.job.status)) window.setTimeout(() => pollJob(jobId), 1500); else setMessage(data.job.errorCode ? `生成失败：${data.job.errorCode}` : `任务状态：${data.job.status}`);
  }

  async function publish() {
    if (!draft) return; try { await api(`coach/plan-drafts/${draft.id}/publish`, { method: "POST", body: JSON.stringify({ effectiveFrom: effectiveFrom || draft.payload.startDate, changeReason: "教练审核发布" }) }, token); setMessage("计划已发布；客户现在只会看到这一版"); setDraft(null); setEffectiveFrom(""); await loadClients(); if (selected) { const data = await api(`coach/clients/${selected.id}/plan-versions`, {}, token); setVersions(data.versions || []); } } catch (error) { setMessage(error instanceof Error ? error.message : "发布失败"); }
  }

  function updateDraftDays(updateDay: (day: DraftDay) => DraftDay) {
    setDraft((current) => current ? { ...current, payload: { ...current.payload, days: current.payload.days.map((day) => updateDay(day)) } } : current);
  }

  function updateDay(dayIndex: number, updateDay: (day: DraftDay) => DraftDay) {
    updateDraftDays((day) => day.dayIndex === dayIndex ? updateDay(day) : day);
  }

  async function saveDraft() {
    if (!draft) return;
    try {
      const data = await api(`coach/plan-drafts/${draft.id}`, { method: "PATCH", body: JSON.stringify({ payload: draft.payload }) }, token);
      setDraft(data.draft as Draft);
      setMessage("修改已保存，并重新通过计划校验");
    } catch (error) { setMessage(error instanceof Error ? error.message : "修改未保存：请检查计划内容"); }
  }

  async function acknowledgeAlert(alertId: string) {
    try {
      const data = await api(`coach/alerts/${alertId}/ack`, { method: "POST" }, token);
      setAlerts((current) => current.map((alert) => alert.id === alertId ? data.alert as CoachAlert : alert));
      setMessage("告警已确认；计划不会自动替换");
    } catch (error) { setMessage(error instanceof Error ? error.message : "告警确认失败"); }
  }

  async function prepareFallback() {
    if (!job) return;
    try {
      const tokenData = await api(`coach/generation-jobs/${job.id}/codex-fallback-token`, { method: "POST" }, token);
      const inputData = await api(`coach/generation-jobs/${job.id}/codex-input`, {}, token);
      const input = JSON.stringify(inputData, null, 2);
      const blobUrl = URL.createObjectURL(new Blob([input], { type: "application/json" }));
      const link = document.createElement("a"); link.href = blobUrl; link.download = `codex-input-${job.id}.json`; link.click(); URL.revokeObjectURL(blobUrl);
      setFallback({ token: tokenData.token, input: `codex-input-${job.id}.json` });
      setMessage("已下载脱敏输入；请在教练本机明确运行 Codex CLI，完成后上传到导入接口");
    } catch (error) { setMessage(error instanceof Error ? error.message : "回退准备失败"); }
  }

  return (
    <main className="coach-shell">
      <section className="coach-header">
        <div><div className="section-kicker">COACH CONSOLE · V1</div><h1>轻练教练台</h1><p>一名教练，把一个月计划交付清楚。</p></div>
        <Link href="/">查看客户端</Link>
      </section>
      <section className="coach-grid">
        <aside className="coach-sidebar">
          <div className="console-card login-card"><div className="section-kicker">SECURE ACCESS</div><h2>教练登录</h2><input value={coachToken} onChange={(event) => setCoachToken(event.target.value)} placeholder="输入后台 token" type="password" /><button onClick={login}>登录 / 刷新会话</button><span className="small-note">生产环境请用 Cloudflare Access 或强密码；此处只做 V1 mockup。</span></div>
          <div className="console-card"><div className="row"><h2>客户</h2><button className="ghost-button" onClick={createInvite} disabled={!ready}>+ 邀请</button></div><div className="client-list">{clients.map((client) => <button className={selected?.id === client.id ? "client-row selected" : "client-row"} key={client.id} onClick={() => selectClient(client)}><span className="client-avatar">{client.displayName.slice(0, 1)}</span><span><strong>{client.displayName}</strong><small>{client.status.replaceAll("_", " ")}</small></span></button>)}{!clients.length && <p className="empty">登录后创建第一位客户。</p>}</div>{invitation && <div className="invite-result"><small>一次性邀请口令</small><code>{invitation}</code><span>请通过私密方式发给客户，不要放在公开群聊。</span></div>}</div>
        </aside>
        <section className="coach-main">
          <div className="console-card status-card"><div><div className="section-kicker">CURRENT CLIENT</div><h2>{selected?.displayName || "还没有选择客户"}</h2><p>{selectedStatus}</p></div><div className="status-orb">{selected ? "●" : "—"}</div></div>
          <div className="console-card"><div className="row"><div><div className="section-kicker">PROFILE REVIEW</div><h2>建档与风险门</h2></div><span className="badge">{profile ? "已填写" : "等待资料"}</span></div>{profile ? <div className="profile-grid"><span>目标<strong>{String(profile.target)}</strong></span><span>训练经验<strong>{String(profile.trainingExperience)}</strong></span><span>每周<strong>{String(profile.sessionsPerWeek)} 次</strong></span><span>风险标记<strong>{Array.isArray(profile.riskFlags) && profile.riskFlags.length ? profile.riskFlags.join(", ") : "无"}</strong></span><span>过敏/忌口<strong>{Array.isArray(profile.allergyFlags) && profile.allergyFlags.length ? profile.allergyFlags.join(", ") : "无"}</strong></span><span>同意<strong>由客户端记录</strong></span></div> : <p className="empty">客户完成建档并同意后，资料会显示在这里。</p>}<button onClick={confirmProfile} disabled={!ready || !selected || !profile} className="secondary-button">确认资料可用于生成</button></div>
          <div className="console-card">
            <div className="row"><div><div className="section-kicker">PLAN WORKFLOW</div><h2>30 天计划</h2><p>脱敏输入 → 本机 Codex CLI → 规则校验 → 教练审核 → 发布</p></div><button onClick={generate} disabled={!ready || !selected}>准备 Codex 草案</button></div>
            {job && <div className="job-strip"><span className={`job-dot ${job.status}`}></span><strong>{jobStatusLabels[job.status] || job.status}</strong><small>{job.errorCode || "不保存原始 prompt / completion"}</small></div>}
            {(job?.status === "awaiting_local" || job?.status === "failed") && !draft && <div className="fallback-box"><strong>等待本机 Codex CLI</strong><p>只有教练明确点击后，才下载脱敏输入并在本机运行 Codex CLI。结果仍需同一校验和审核。</p><button className="secondary-button" onClick={prepareFallback}>下载输入并生成一次性 token</button>{fallback && <><code className="fallback-token">一次性导入 token：{fallback.token}</code><small>输入文件：{fallback.input}<br />运行：npm run codex:plan -- --input {fallback.input} --output plan.json --post-url {window.location.origin}/api/codex-fallback/import --token {fallback.token}</small></>}</div>}
            {draft && <div className="draft-review"><div className="row"><strong>草案已通过结构化校验</strong><span className="badge">仅教练可见</span></div><p>共 {draft.payload.days.length} 天；发布后客户才会看到。你可以先调整，再保存。</p><label className="effective-date">生效日期<input type="date" value={effectiveFrom || draft.payload.startDate} onChange={(event) => setEffectiveFrom(event.target.value)} /></label><div className="draft-day-list">{draft.payload.days.map((day) => <details className="draft-day" key={day.localDate} open={day.dayIndex === 1}><summary>第 {day.dayIndex} 天 · {day.localDate} · {day.title}</summary><label>今日主题<input value={day.title} onChange={(event) => updateDay(day.dayIndex, (current) => ({ ...current, title: event.target.value }))} /></label><div className="draft-editor-section"><span className="draft-editor-label">训练动作</span>{day.exercises.map((exercise, exerciseIndex) => <div className="draft-item" key={`${day.dayIndex}-${exercise.catalogId}`}><strong>{exerciseLabels[exercise.catalogId] || exercise.catalogId}</strong><label>组数<input type="number" min="1" max="10" value={exercise.sets} onChange={(event) => updateDay(day.dayIndex, (current) => ({ ...current, exercises: current.exercises.map((item, index) => index === exerciseIndex ? { ...item, sets: Number(event.target.value) } : item) }))} /></label><label>次数<input type="number" min="1" max="100" value={exercise.reps} onChange={(event) => updateDay(day.dayIndex, (current) => ({ ...current, exercises: current.exercises.map((item, index) => index === exerciseIndex ? { ...item, reps: Number(event.target.value) } : item) }))} /></label><label>休息秒数<input type="number" min="0" max="600" value={exercise.restSeconds} onChange={(event) => updateDay(day.dayIndex, (current) => ({ ...current, exercises: current.exercises.map((item, index) => index === exerciseIndex ? { ...item, restSeconds: Number(event.target.value) } : item) }))} /></label></div>)}</div><div className="draft-editor-section"><span className="draft-editor-label">餐次与份量</span>{day.meals.map((meal, mealIndex) => <div className="draft-meal" key={`${day.dayIndex}-${meal.mealType}`}><strong>{mealLabels[meal.mealType]}</strong>{meal.foods.map((food, foodIndex) => <label key={`${meal.mealType}-${food.foodCatalogId}`}>{foodLabels[food.foodCatalogId] || food.foodCatalogId}<input type="number" min="1" max="2000" value={food.grams} onChange={(event) => updateDay(day.dayIndex, (current) => ({ ...current, meals: current.meals.map((item, index) => index === mealIndex ? { ...item, foods: item.foods.map((entry, entryIndex) => entryIndex === foodIndex ? { ...entry, grams: Number(event.target.value) } : entry) } : item) }))} /><span>g</span></label>)}</div>)}</div><label>今日提醒<textarea value={day.reminders.join("\n")} onChange={(event) => updateDay(day.dayIndex, (current) => ({ ...current, reminders: event.target.value.split("\n").map((line) => line.trim()).filter(Boolean) }))} /></label></details>)}</div><div className="row draft-actions"><button className="secondary-button" onClick={saveDraft}>保存修改</button><button className="secondary-button" onClick={() => api(`coach/plan-drafts/${draft.id}/reject`, { method: "POST", body: JSON.stringify({ reason: "需要调整" }) }, token).then(() => { setDraft(null); setMessage("草案已退回") })}>退回修改</button><button onClick={publish}>审核并发布</button></div></div>}
            {!draft && <div className="workflow-hint"><span>1</span>确认资料 <span>2</span>本机生成 <span>3</span>审核发布</div>}
            {versions.length > 0 && <div className="version-history"><div className="draft-editor-label">发布历史</div>{versions.map((version) => <div className="version-row" key={version.id}><span><strong>V{version.versionNo}</strong><small>{version.effectiveFrom}{version.effectiveTo ? ` → ${version.effectiveTo}` : " → 当前"}</small></span><em>{version.changeReason || "初始计划"}</em></div>)}</div>}
          </div>
          <div className="console-card">
            <div className="row"><div><div className="section-kicker">LAST 7 DAYS</div><h2>执行与需要关注</h2></div><button className="ghost-button" onClick={() => selected && selectClient(selected)}>刷新</button></div>
            {summary ? <div className="summary-grid"><span>打开天数<strong>{summary.openedDays} 天</strong></span><span>训练打卡<strong>{summary.trainingCheckins} 次</strong></span><span>饮食打卡<strong>{summary.mealCheckins} 次</strong></span><span>身体反馈<strong>{summary.feedbackDays} 天</strong></span></div> : <p className="empty">选择客户后显示近 7 天摘要。</p>}
            <div className="alert-list">{alerts.map((alert) => <div className={alert.status === "acknowledged" ? "alert-row acknowledged" : "alert-row"} key={alert.id}><span><strong>{alert.clientName || selected?.displayName || "客户"} · {alert.localDate}</strong><small>{alert.status === "acknowledged" ? "已确认" : "疼痛反馈：请联系客户"}</small></span>{alert.status !== "acknowledged" && <button className="ghost-button" onClick={() => acknowledgeAlert(alert.id)}>确认</button>}</div>)}{!alerts.length && <p className="empty">目前没有疼痛告警；系统不会自动替换动作。</p>}</div>
          </div>
          <div className="toast-message">{message}</div>
        </section>
      </section>
    </main>
  );
}
