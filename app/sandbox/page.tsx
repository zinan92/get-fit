"use client";

/* The local sandbox deliberately uses native anchors and native GIF images for Sites/vinext compatibility. */
/* eslint-disable @next/next/no-html-link-for-pages, @next/next/no-img-element */

import { useEffect, useMemo, useState } from "react";
import { FoodFace } from "../components/food-face";
import "./sandbox.css";

type SandboxStep = "invite" | "consent" | "profile" | "waiting" | "today";
type Client = { id: string; displayName: string; status: string; createdAt: string };
type MeResponse = { client: Client; profile: Record<string, unknown> | null; consents: string[] };
type Exercise = {
  catalogId: string;
  name: string;
  sets: number;
  reps: number;
  restSeconds: number;
  target?: string;
  equipment?: string;
  steps?: string[];
  mediaPath?: string | null;
};
type Food = { foodCatalogId: string; name: string; grams: number; unit: string; kcal: number };
type Meal = { mealType: string; mealKcal: number; foods: Food[] };
type PlanDay = { localDate: string; dayIndex: number; title: string; exercises: Exercise[]; meals: Meal[]; reminders: string[]; dailyKcal: number };
type TodayResponse = { status: string; date: string; plan: { id: string; versionNo: number; day: PlanDay } | null; checkins: Array<{ itemId: string; itemType: string; status: string }> };
type CalendarDay = { date: string; title: string; hasTraining: boolean; mealCount: number };
type CalendarResponse = { month: string; days: CalendarDay[] };
type CheckinType = "exercise" | "meal" | "water";

const sessionStorageKey = "fit_plan_sandbox_session";
const requiredConsentTypes = ["health_processing", "third_party_model"];
const consentOptions = [
  ["health_processing", "我同意处理必要的健康与饮食资料"],
  ["third_party_model", "我同意将去身份化资料交给第三方模型辅助生成"],
  ["subscription_message", "我同意接收每日计划提醒（可单独关闭）"],
] as const;
const targetOptions = [
  ["fat_loss", "减脂"],
  ["muscle_gain", "增肌"],
  ["general_fitness", "保持体能"],
] as const;
const experienceOptions = [
  ["beginner", "新手"],
  ["intermediate", "有训练经验"],
  ["advanced", "进阶"],
] as const;

function localDate(): string {
  return new Date(Date.now() + 8 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function isLocalBrowser(): boolean {
  if (typeof window === "undefined") return false;
  return window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
}

async function requestApi<T>(path: string, init: RequestInit = {}, token = ""): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: { "content-type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers || {}) },
  });
  const payload = await response.json().catch(() => null) as { error?: { message?: string } } | null;
  if (!response.ok) throw new Error(payload?.error?.message || "请求失败，请稍后再试");
  return payload as T;
}

function friendlyStatus(status: string): string {
  if (status === "invited") return "等待接受邀请";
  if (status === "onboarding") return "正在建档";
  if (status === "pending_profile_review") return "等待教练确认资料";
  if (status === "active") return "计划进行中";
  if (status === "deletion_pending") return "删除申请处理中";
  return status.replaceAll("_", " ");
}

function browserMediaPath(mediaPath: string | null | undefined): string | null {
  if (!mediaPath) return null;
  if (mediaPath.startsWith("/assets/exercises/")) return mediaPath.replace("/assets/exercises/", "/exercise-preview/");
  if (mediaPath.startsWith("/exercise-preview/")) return mediaPath;
  return null;
}

export default function SandboxPage() {
  const [runtime, setRuntime] = useState<"checking" | "local" | "blocked">("checking");
  const [step, setStep] = useState<SandboxStep>("invite");
  const [sessionToken, setSessionToken] = useState("");
  const [client, setClient] = useState<Client | null>(null);
  const [consents, setConsents] = useState<string[]>([]);
  const [inviteToken, setInviteToken] = useState("");
  const [target, setTarget] = useState<(typeof targetOptions)[number][0]>("fat_loss");
  const [experience, setExperience] = useState<(typeof experienceOptions)[number][0]>("beginner");
  const [heightCm, setHeightCm] = useState("170");
  const [weightKg, setWeightKg] = useState("65");
  const [viewDate, setViewDate] = useState(localDate);
  const [today, setToday] = useState<PlanDay | null>(null);
  const [planId, setPlanId] = useState("");
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [calendar, setCalendar] = useState<CalendarDay[]>([]);
  const [showCalendar, setShowCalendar] = useState(false);
  const [feedback, setFeedback] = useState({ pain: "none", energy: "normal", hunger: "normal" });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("先从教练发来的邀请口令开始");
  const [error, setError] = useState("");
  const todayLabel = useMemo(() => `${viewDate.slice(5, 7)} 月 ${viewDate.slice(8, 10)} 日`, [viewDate]);

  useEffect(() => {
    if (!isLocalBrowser()) {
      // Runtime host detection must happen after hydration so SSR stays deterministic.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRuntime("blocked");
      return;
    }
    setRuntime("local");
    const savedToken = window.localStorage.getItem(sessionStorageKey);
    if (!savedToken) return;
    setSessionToken(savedToken);
    setLoading(true);
    requestApi<MeResponse>("/api/me", {}, savedToken)
      .then((result) => {
        setClient(result.client);
        setConsents(result.consents || []);
        if (!result.consents?.includes(requiredConsentTypes[0]) || !result.consents?.includes(requiredConsentTypes[1])) setStep("consent");
        else if (!result.profile) setStep("profile");
        else setStep("waiting");
      })
      .catch(() => {
        window.localStorage.removeItem(sessionStorageKey);
        setSessionToken("");
      })
      .finally(() => setLoading(false));
  }, []);

  async function acceptInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!inviteToken.trim()) return setError("请先粘贴教练发来的邀请口令");
    setLoading(true); setError("");
    try {
      const accepted = await requestApi<{ client: Client }>("/api/invitations/accept", { method: "POST", body: JSON.stringify({ token: inviteToken.trim() }) });
      const clientId = accepted.client.id;
      const login = await requestApi<{ sessionToken: string; client: Client }>("/api/wx/auth/login", {
        method: "POST",
        body: JSON.stringify({ devOpenid: `openid-local-sandbox:${clientId}`, devClientId: clientId, invitationToken: inviteToken.trim() }),
      });
      window.localStorage.setItem(sessionStorageKey, login.sessionToken);
      setSessionToken(login.sessionToken); setClient(login.client); setStep("consent"); setMessage("邀请已接受，下一步确认三项说明");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "邀请暂时不可用"); }
    finally { setLoading(false); }
  }

  async function saveConsents(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!requiredConsentTypes.every((type) => consents.includes(type))) return setError("健康资料和第三方模型两项说明必须分别同意");
    setLoading(true); setError("");
    try {
      const result = await requestApi<{ consents: string[] }>("/api/me/consents", { method: "POST", body: JSON.stringify({ types: consents }) }, sessionToken);
      setConsents(result.consents); setStep("profile"); setMessage("说明已记录，只收集生成所需的最小资料");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "说明提交失败"); }
    finally { setLoading(false); }
  }

  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const height = Number(heightCm); const weight = Number(weightKg);
    if (!Number.isFinite(height) || !Number.isFinite(weight)) return setError("请填写有效的身高和体重");
    setLoading(true); setError("");
    try {
      await requestApi("/api/me/profile", { method: "PUT", body: JSON.stringify({ target, ageBand: "25_34", heightCm: height, weightKg: weight, trainingExperience: experience, sessionsPerWeek: 3, minutesPerSession: 45, equipment: ["dumbbell"], injuryFlags: [], allergyFlags: [], dietaryPreferences: [], riskFlags: [], timezone: "Asia/Shanghai" }) }, sessionToken);
      setStep("waiting"); setMessage("资料已提交，等教练确认后生成并发布 30 天计划");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "资料提交失败"); }
    finally { setLoading(false); }
  }

  async function loadToday(date = viewDate) {
    if (!sessionToken) return;
    setLoading(true); setError("");
    try {
      const result = await requestApi<TodayResponse>(`/api/plan/today?date=${date}`, {}, sessionToken);
      setViewDate(date);
      if (!result.plan?.day) { setToday(null); setPlanId(""); setStep("waiting"); setMessage("教练还没有发布这一天的计划"); return; }
      setToday(result.plan.day); setPlanId(result.plan.id); setDone(Object.fromEntries((result.checkins || []).map((item) => [item.itemId, item.status === "completed"]))); setStep("today"); setMessage("这是已发布的客户计划，草案不会出现在这里");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "计划加载失败"); }
    finally { setLoading(false); }
  }

  async function loadCalendar() {
    if (!sessionToken) return;
    setLoading(true); setError("");
    try {
      const result = await requestApi<CalendarResponse>(`/api/plans/calendar?month=${viewDate.slice(0, 7)}`, {}, sessionToken);
      setCalendar(result.days || []); setShowCalendar(true);
    } catch (caught) { setError(caught instanceof Error ? caught.message : "日历加载失败"); }
    finally { setLoading(false); }
  }

  async function toggleCheckin(itemId: string, itemType: CheckinType) {
    if (!today || !planId) return;
    const next = !done[itemId]; setDone((current) => ({ ...current, [itemId]: next })); setError("");
    try {
      await requestApi("/api/checkins", { method: "PUT", body: JSON.stringify({ localDate: viewDate, planDayId: `${planId}:${viewDate}`, itemId, itemType, status: next ? "completed" : "not_completed" }) }, sessionToken);
    } catch (caught) { setDone((current) => ({ ...current, [itemId]: !next })); setError(caught instanceof Error ? caught.message : "打卡失败，请再试一次"); }
  }

  async function submitFeedback(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    try {
      await requestApi("/api/wellness-feedback", { method: "PUT", body: JSON.stringify({ localDate: viewDate, ...feedback }) }, sessionToken);
      setMessage(feedback.pain === "present" ? "疼痛反馈已送达教练，请停止相关动作" : "今天的身体反馈已记录");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "反馈提交失败"); }
    finally { setLoading(false); }
  }

  async function requestDeletion() {
    if (!window.confirm("提交删除申请后会进入 30 天恢复期，确定继续吗？")) return;
    setLoading(true); setError("");
    try {
      await requestApi("/api/me", { method: "DELETE" }, sessionToken);
      window.localStorage.removeItem(sessionStorageKey); setSessionToken(""); setClient(null); setToday(null); setStep("invite"); setMessage("删除申请已记录，本地沙盒会话已清除");
    } catch (caught) { setError(caught instanceof Error ? caught.message : "删除申请失败"); }
    finally { setLoading(false); }
  }

  function clearSession() {
    window.localStorage.removeItem(sessionStorageKey); setSessionToken(""); setClient(null); setToday(null); setPlanId(""); setDone({}); setConsents([]); setInviteToken(""); setStep("invite"); setMessage("本地沙盒已清除，可以换一条邀请重新开始"); setError("");
  }

  if (runtime === "checking") return <main className="sandbox-shell"><section className="sandbox-panel"><p className="sandbox-kicker">轻练 · LOCAL SANDBOX</p><h1>正在检查本地环境…</h1></section></main>;
  if (runtime === "blocked") return <main className="sandbox-shell"><section className="sandbox-panel blocked"><p className="sandbox-kicker">轻练 · LOCAL SANDBOX</p><h1>这里只能在本地打开</h1><p>本地客户沙盒不会在生产地址尝试开发身份登录。请运行本地 Worker 后访问 localhost。</p><a className="sandbox-link" href="/">回到产品首页 →</a></section></main>;

  return (
    <main className="sandbox-shell">
      <div className="sandbox-orb sandbox-orb-one" />
      <div className="sandbox-orb sandbox-orb-two" />
      <section className="sandbox-panel">
        <header className="sandbox-header">
          <a className="sandbox-brand" href="/"><span>轻</span><strong>轻练</strong></a>
          <span className="sandbox-badge">LOCAL ONLY · 非生产</span>
        </header>
        <section className="sandbox-hero">
          <div><p className="sandbox-kicker">CUSTOMER SANDBOX</p><h1>先把产品用起来，<br />AppID 之后再接。</h1><p>这里调用的是真实客户 API，只把微信身份替换成本地开发身份。</p></div>
          <div className="sandbox-orbit">{client ? <><strong>{client.displayName.slice(0, 1)}</strong><small>{friendlyStatus(client.status)}</small></> : <><strong>◎</strong><small>等待邀请</small></>}</div>
        </section>
        <div className="sandbox-steps" aria-label="客户流程">
          {["邀请", "同意", "建档", "执行"].map((label, index) => <span className={index <= (["invite", "consent", "profile", "waiting", "today"].indexOf(step) === 4 ? 3 : ["invite", "consent", "profile", "waiting"].indexOf(step)) ? "active" : ""} key={label}><i>{index + 1}</i>{label}</span>)}
        </div>
        {client && <div className="sandbox-client-bar"><span>当前客户：<strong>{client.displayName}</strong></span><button type="button" onClick={clearSession}>清除本地会话</button></div>}
        {error && <div className="sandbox-error" role="alert">{error}</div>}
        {message && <p className="sandbox-message">{message}</p>}

        {step === "invite" && <form className="sandbox-card sandbox-form" onSubmit={acceptInvite}><div className="sandbox-card-heading"><div><p className="sandbox-kicker">STEP 01</p><h2>输入教练邀请</h2></div><span>一次性口令</span></div><p>请先在 <a href="/coach">教练台</a> 创建一条邀请，再把口令粘贴到这里。</p><label>邀请口令<input value={inviteToken} onChange={(event) => setInviteToken(event.target.value)} placeholder="粘贴邀请口令" autoComplete="off" /></label><button className="sandbox-primary" disabled={loading}>{loading ? "正在进入…" : "接受邀请并进入"}</button></form>}

        {step === "consent" && <form className="sandbox-card sandbox-form" onSubmit={saveConsents}><div className="sandbox-card-heading"><div><p className="sandbox-kicker">STEP 02</p><h2>先读懂，再继续</h2></div><span>分开记录</span></div><p>两项必要说明必须同意；提醒是可选的。教练只会看到必要状态，不会看到这里的开发身份。</p><div className="sandbox-check-list">{consentOptions.map(([value, label]) => <label key={value}><input type="checkbox" checked={consents.includes(value)} onChange={(event) => setConsents((current) => event.target.checked ? [...new Set([...current, value])] : current.filter((item) => item !== value))} /><span>{label}</span></label>)}</div><button className="sandbox-primary" disabled={loading}>{loading ? "正在保存…" : "同意并继续建档"}</button></form>}

        {step === "profile" && <form className="sandbox-card sandbox-form" onSubmit={saveProfile}><div className="sandbox-card-heading"><div><p className="sandbox-kicker">STEP 03</p><h2>告诉教练最必要的事</h2></div><span>结构化建档</span></div><div className="sandbox-form-grid"><label>目标<select value={target} onChange={(event) => setTarget(event.target.value as typeof target)}>{targetOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>训练经验<select value={experience} onChange={(event) => setExperience(event.target.value as typeof experience)}>{experienceOptions.map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>身高（cm）<input type="number" min="120" max="230" value={heightCm} onChange={(event) => setHeightCm(event.target.value)} /></label><label>体重（kg）<input type="number" min="30" max="250" value={weightKg} onChange={(event) => setWeightKg(event.target.value)} /></label></div><p className="sandbox-safety">如有孕期、急性疼痛、严重慢病或饮食障碍，请先直接联系教练；本地沙盒不会绕过风险门。</p><button className="sandbox-primary" disabled={loading}>{loading ? "正在提交…" : "提交给教练确认"}</button></form>}

        {step === "waiting" && <section className="sandbox-card waiting-card"><div className="waiting-icon">☼</div><p className="sandbox-kicker">WAITING FOR COACH</p><h2>资料已交给教练，<br />发布后就能开始。</h2><p>这一步不会显示 AI 草案。请让教练在教练台确认资料、运行本机 Codex CLI、审核并发布计划。</p><div className="waiting-actions"><button className="sandbox-primary" onClick={() => loadToday()} disabled={loading}>{loading ? "正在检查…" : "检查今天的计划"}</button><a className="sandbox-secondary" href="/coach">打开教练台</a></div></section>}

        {step === "today" && today && <section className="sandbox-today"><div className="sandbox-today-head"><div><p className="sandbox-kicker">PUBLISHED PLAN · DAY {String(today.dayIndex).padStart(2, "0")}</p><h2>{todayLabel} · {today.title}</h2><p>教练已确认 · 当天约 {today.dailyKcal} kcal</p></div><div className="sandbox-today-actions"><button type="button" onClick={() => void loadCalendar()} disabled={loading}>30 天日历</button><input aria-label="选择查看日期" type="date" value={viewDate} onChange={(event) => void loadToday(event.target.value)} /></div></div>{showCalendar && <div className="sandbox-calendar">{calendar.length ? calendar.map((day) => <button type="button" key={day.date} className={day.date === viewDate ? "selected" : ""} onClick={() => { setShowCalendar(false); void loadToday(day.date); }}><strong>{day.date.slice(8)}</strong><small>{day.hasTraining ? "练" : "休"}</small></button>) : <p>这个月还没有已发布日期。</p>}</div>}<div className="sandbox-content-grid"><div><section className="sandbox-card"><div className="sandbox-card-heading"><div><p className="sandbox-kicker">TRAINING</p><h3>今天练什么</h3></div><span>{today.exercises.length} 个动作</span></div>{today.exercises.map((exercise, index) => <article className="sandbox-exercise" key={exercise.catalogId}><div className="sandbox-exercise-top"><div className="sandbox-media"><span>动作要领</span>{browserMediaPath(exercise.mediaPath) && <img src={browserMediaPath(exercise.mediaPath) || undefined} alt={`${exercise.name} 动作演示`} onError={(event) => event.currentTarget.remove()} />}</div><div><small>0{index + 1} · {exercise.target || "全身"}</small><h4>{exercise.name}</h4><p>{exercise.sets} 组 × {exercise.reps} 次 · 休息 {exercise.restSeconds} 秒</p><em>{exercise.equipment || "无需器械"}</em></div><button type="button" className={done[exercise.catalogId] ? "sandbox-check done" : "sandbox-check"} onClick={() => void toggleCheckin(exercise.catalogId, "exercise")}>{done[exercise.catalogId] ? "✓" : "完成"}</button></div><details open={index === 0}><summary>展开动作要领 <span>{exercise.steps?.length || 0} 步</span></summary><ol>{(exercise.steps || []).map((stepText) => <li key={stepText}>{stepText}</li>)}</ol><p className="sandbox-note">出现疼痛时先停下，并联系教练。</p></details></article>)}</section><section className="sandbox-card"><div className="sandbox-card-heading"><div><p className="sandbox-kicker">MEALS</p><h3>今天吃什么</h3></div><span>约 {today.dailyKcal} kcal</span></div>{today.meals.map((meal) => <article className="sandbox-meal" key={meal.mealType}><div className="sandbox-meal-head"><h4>{meal.mealType === "breakfast" ? "早餐" : meal.mealType === "lunch" ? "午餐" : meal.mealType === "snack" ? "下午加餐" : "晚餐"}</h4><button type="button" className={done[meal.mealType] ? "meal-done done" : "meal-done"} onClick={() => void toggleCheckin(meal.mealType, "meal")}>{done[meal.mealType] ? "已吃完" : "完成打卡"}</button></div>{meal.foods.map((food) => <div className="sandbox-food" key={food.foodCatalogId}><span className="sandbox-food-name"><FoodFace tone={meal.mealType} /><span><strong>{food.name}</strong><small>{food.grams}{food.unit}</small></span></span><b>{food.kcal} kcal</b></div>)}<div className="sandbox-meal-total"><span>本餐合计</span><strong>{meal.mealKcal} kcal</strong></div></article>)}</section></div><aside><section className="sandbox-card reminder-card"><p className="sandbox-kicker">REMINDERS</p><h3>今天注意</h3>{today.reminders.map((reminder) => <p key={reminder}>· {reminder}</p>)}<button type="button" className={done.water ? "water-button done" : "water-button"} onClick={() => void toggleCheckin("water", "water")}>{done.water ? "✓ 今天喝水已完成" : "○ 完成 2L 喝水打卡"}</button></section><form className="sandbox-card feedback-card" onSubmit={submitFeedback}><p className="sandbox-kicker">FEEDBACK</p><h3>今天身体感觉如何？</h3><label>疼痛<select value={feedback.pain} onChange={(event) => setFeedback((current) => ({ ...current, pain: event.target.value }))}><option value="none">没有</option><option value="present">有</option></select></label><label>精力<select value={feedback.energy} onChange={(event) => setFeedback((current) => ({ ...current, energy: event.target.value }))}><option value="low">低</option><option value="normal">正常</option><option value="good">好</option></select></label><label>饥饿感<select value={feedback.hunger} onChange={(event) => setFeedback((current) => ({ ...current, hunger: event.target.value }))}><option value="low">低</option><option value="normal">正常</option><option value="high">高</option></select></label><button className="sandbox-primary" disabled={loading}>{loading ? "正在提交…" : "提交给教练"}</button><p className="sandbox-small">疼痛为“有”时，系统只会提醒停止相关动作并通知教练。</p></form><button type="button" className="sandbox-danger" onClick={() => void requestDeletion()}>申请删除我的资料</button></aside></div></section>}
      </section>
    </main>
  );
}
