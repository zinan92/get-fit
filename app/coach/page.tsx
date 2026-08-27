"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import "./coach.css";

type Client = { id: string; displayName: string; status: string; createdAt: string };
type Job = { id: string; status: string; errorCode: string | null; traceId: string };

const jobStatusLabels: Record<string, string> = {
  awaiting_local: "等待本机 Codex",
  pending_review: "等待审核",
  published: "已发布",
  rejected: "已退回",
  failed: "失败",
};

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
  const [draft, setDraft] = useState<{ id: string; status: string; payload: Record<string, unknown> } | null>(null);
  const [fallback, setFallback] = useState<{ token: string; input: string } | null>(null);
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
    setSelected(client); try { const data = await api(`coach/clients/${client.id}/profile`, {}, auth); setProfile(data.profile); } catch (error) { setMessage(error instanceof Error ? error.message : "资料加载失败"); }
  }

  async function createInvite() {
    const name = window.prompt("客户显示名（不要填写身份证、手机号等敏感信息）", "新客户"); if (!name) return;
    try { const data = await api("coach/invitations", { method: "POST", body: JSON.stringify({ displayName: name }) }, token); setInvitation(data.invitation.token); setMessage("邀请已创建；口令只展示一次"); await loadClients(); } catch (error) { setMessage(error instanceof Error ? error.message : "创建失败"); }
  }

  async function confirmProfile() {
    if (!selected) return; try { await api(`coach/clients/${selected.id}/profile/confirm`, { method: "POST" }, token); setMessage("资料已确认"); await loadClients(); } catch (error) { setMessage(error instanceof Error ? error.message : "确认失败"); }
  }

  async function generate() {
    if (!selected) return; try { const data = await api(`coach/clients/${selected.id}/plan-generations`, { method: "POST", body: JSON.stringify({ startDate: new Date().toISOString().slice(0, 10) }) }, token); setJob(data.job); setDraft(null); setFallback(null); setMessage("已创建本机 Codex CLI 任务；客户端不会看到草案"); pollJob(data.job.id); } catch (error) { setMessage(error instanceof Error ? error.message : "生成失败"); }
  }

  async function pollJob(jobId: string) {
    const data = await api(`coach/generation-jobs/${jobId}`, {}, token); setJob(data.job); if (data.draft) { const detail = await api(`coach/plan-drafts/${data.draft.id}`, {}, token); setDraft(detail.draft); setMessage("草案已生成，等待教练审核"); return; } if (["queued", "running"].includes(data.job.status)) window.setTimeout(() => pollJob(jobId), 1500); else setMessage(data.job.errorCode ? `生成失败：${data.job.errorCode}` : `任务状态：${data.job.status}`);
  }

  async function publish() {
    if (!draft) return; try { await api(`coach/plan-drafts/${draft.id}/publish`, { method: "POST", body: JSON.stringify({ changeReason: "教练审核发布" }) }, token); setMessage("计划已发布；客户现在只会看到这一版"); setDraft(null); await loadClients(); } catch (error) { setMessage(error instanceof Error ? error.message : "发布失败"); }
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

  return <main className="coach-shell">
    <section className="coach-header"><div><div className="section-kicker">COACH CONSOLE · V1</div><h1>轻练教练台</h1><p>一名教练，把一个月计划交付清楚。</p></div><Link href="/">查看客户端</Link></section>
    <section className="coach-grid">
      <aside className="coach-sidebar">
        <div className="console-card login-card"><div className="section-kicker">SECURE ACCESS</div><h2>教练登录</h2><input value={coachToken} onChange={(event) => setCoachToken(event.target.value)} placeholder="输入后台 token" type="password" /><button onClick={login}>登录 / 刷新会话</button><span className="small-note">生产环境请用 Cloudflare Access 或强密码；此处只做 V1 mockup。</span></div>
        <div className="console-card"><div className="row"><h2>客户</h2><button className="ghost-button" onClick={createInvite} disabled={!ready}>+ 邀请</button></div><div className="client-list">{clients.map((client) => <button className={selected?.id === client.id ? "client-row selected" : "client-row"} key={client.id} onClick={() => selectClient(client)}><span className="client-avatar">{client.displayName.slice(0, 1)}</span><span><strong>{client.displayName}</strong><small>{client.status.replaceAll("_", " ")}</small></span></button>)}{!clients.length && <p className="empty">登录后创建第一位客户。</p>}</div>{invitation && <div className="invite-result"><small>一次性邀请口令</small><code>{invitation}</code><span>请通过私密方式发给客户，不要放在公开群聊。</span></div>}</div>
      </aside>
      <section className="coach-main">
        <div className="console-card status-card"><div><div className="section-kicker">CURRENT CLIENT</div><h2>{selected?.displayName || "还没有选择客户"}</h2><p>{selectedStatus}</p></div><div className="status-orb">{selected ? "●" : "—"}</div></div>
        <div className="console-card"><div className="row"><div><div className="section-kicker">PROFILE REVIEW</div><h2>建档与风险门</h2></div><span className="badge">{profile ? "已填写" : "等待资料"}</span></div>{profile ? <div className="profile-grid"><span>目标<strong>{String(profile.target)}</strong></span><span>训练经验<strong>{String(profile.trainingExperience)}</strong></span><span>每周<strong>{String(profile.sessionsPerWeek)} 次</strong></span><span>风险标记<strong>{Array.isArray(profile.riskFlags) && profile.riskFlags.length ? profile.riskFlags.join(", ") : "无"}</strong></span><span>过敏/忌口<strong>{Array.isArray(profile.allergyFlags) && profile.allergyFlags.length ? profile.allergyFlags.join(", ") : "无"}</strong></span><span>同意<strong>由客户端记录</strong></span></div> : <p className="empty">客户完成建档并同意后，资料会显示在这里。</p>}<button onClick={confirmProfile} disabled={!ready || !selected || !profile} className="secondary-button">确认资料可用于生成</button></div>
        <div className="console-card"><div className="row"><div><div className="section-kicker">PLAN WORKFLOW</div><h2>30 天计划</h2><p>脱敏输入 → 本机 Codex CLI → 规则校验 → 教练审核 → 发布</p></div><button onClick={generate} disabled={!ready || !selected}>准备 Codex 草案</button></div>{job && <div className="job-strip"><span className={`job-dot ${job.status}`}></span><strong>{jobStatusLabels[job.status] || job.status}</strong><small>{job.errorCode || "不保存原始 prompt / completion"}</small></div>}{(job?.status === "awaiting_local" || job?.status === "failed") && !draft && <div className="fallback-box"><strong>等待本机 Codex CLI</strong><p>只有教练明确点击后，才下载脱敏输入并在本机运行 Codex CLI。结果仍需同一校验和审核。</p><button className="secondary-button" onClick={prepareFallback}>下载输入并生成一次性 token</button>{fallback && <><code className="fallback-token">一次性导入 token：{fallback.token}</code><small>输入文件：{fallback.input}<br />运行：npm run codex:plan -- --input {fallback.input} --output plan.json --post-url {window.location.origin}/api/codex-fallback/import --token {fallback.token}</small></>}</div>}{draft && <div className="draft-review"><div className="row"><strong>草案已通过结构化校验</strong><span className="badge">仅教练可见</span></div><p>共 {Array.isArray(draft.payload.days) ? draft.payload.days.length : 0} 天；发布后客户才会看到。</p><div className="row"><button className="secondary-button" onClick={() => api(`coach/plan-drafts/${draft.id}/reject`, { method: "POST", body: JSON.stringify({ reason: "需要调整" }) }, token).then(() => { setDraft(null); setMessage("草案已退回") })}>退回修改</button><button onClick={publish}>审核并发布</button></div></div>}{!draft && <div className="workflow-hint"><span>1</span>确认资料 <span>2</span>本机生成 <span>3</span>审核发布</div>}</div>
        <div className="console-card"><div className="row"><div><div className="section-kicker">ALERTS</div><h2>需要关注</h2></div><button className="ghost-button" onClick={() => api("coach/alerts", {}, token).then((data) => setMessage(data.alerts.length ? `有 ${data.alerts.length} 条告警` : "目前没有告警"))}>刷新</button></div><p className="empty">疼痛反馈会进入这里；系统不会自动替换动作。</p></div>
        <div className="toast-message">{message}</div>
      </section>
    </section>
  </main>;
}
