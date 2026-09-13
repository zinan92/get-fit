"use client";

import { useMemo, useState } from "react";
import { MiniNav } from "../components/mini-nav";
import "./plan.css";

type PlanDay = {
  dayIndex: number;
  date: string;
  weekday: string;
  title: string;
  kind: "training" | "recovery";
  detail: string;
  kcal: number;
  exerciseCount: number;
};

const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];

const planDays: PlanDay[] = Array.from({ length: 30 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 7, 4 + index));
  const weekday = weekdayLabels[date.getUTCDay()];
  const weekPattern = index % 7;
  const training = weekPattern === 0 || weekPattern === 2 || weekPattern === 4;
  const title = training
    ? ["全身激活日", "下肢力量日", "上肢力量日"][Math.floor(index / 7) % 3]
    : "恢复与轻活动";
  return {
    dayIndex: index + 1,
    date: `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`,
    weekday,
    title,
    kind: training ? "training" : "recovery",
    detail: training ? "训练 + 拉伸" : "散步 + 放松",
    kcal: training ? 1700 : 1550,
    exerciseCount: training ? 3 : 0,
  };
});

const selectedExerciseSets = [
  ["高脚杯深蹲", "4 组 × 12 次"],
  ["单臂哑铃划船", "4 组 × 10 次 / 侧"],
  ["臀桥", "3 组 × 15 次"],
];

export default function PlanPage() {
  const [selectedIndex, setSelectedIndex] = useState(7);
  const selected = planDays[selectedIndex];
  const weekLabel = useMemo(() => `第 ${Math.floor((selected.dayIndex - 1) / 7) + 1} 周`, [selected.dayIndex]);

  return (
    <main className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />
      <section className="phone plan-phone" aria-label="轻练计划 mockup">
        <header className="topbar">
          {/* Native anchors keep navigation working in the Sites/vinext runtime. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a className="brand" href="/" aria-label="返回轻练今天">
            <span className="brand-mark">轻</span>
            <span>轻练</span>
          </a>
          <span className="subpage-label">30 天计划</span>
        </header>

        <div className="scroll-content" id="plan-top">
          <section className="subpage-welcome">
            <div>
              <p className="eyebrow">AUGUST · 2026</p>
              <h1>一步一步，<br />把这个月走完。</h1>
              <p className="welcome-copy">教练已为你安排好未来 30 天。</p>
            </div>
            <div className="month-progress"><strong>8</strong><span>/ 30 天</span></div>
          </section>

          <section className="plan-summary-strip" aria-label="计划摘要">
            <span><strong>3</strong> 次 / 周训练</span>
            <span><strong>4</strong> 个餐次 / 天</span>
            <span><strong>教练已确认</strong></span>
          </section>

          <section className="calendar-section">
            <div className="section-heading">
              <div><p className="section-kicker">CALENDAR</p><h2>选择一天</h2></div>
              <span className="section-meta">{weekLabel}</span>
            </div>
            <div className="calendar-weekdays" aria-hidden="true">
              {weekdayLabels.map((day) => <span key={day}>{day}</span>)}
            </div>
            <div className="plan-calendar" aria-label="30 天计划日历">
              {planDays.map((day, index) => (
                <button
                  className={`plan-day ${day.kind} ${index === selectedIndex ? "selected" : ""}`}
                  type="button"
                  key={day.dayIndex}
                  aria-label={`第 ${day.dayIndex} 天，${day.date}，${day.title}`}
                  aria-pressed={index === selectedIndex}
                  onClick={() => setSelectedIndex(index)}
                >
                  <small>{day.dayIndex}</small>
                  <strong>{day.date.slice(day.date.indexOf("月") + 1, -1)}</strong>
                  <i aria-hidden="true" />
                </button>
              ))}
            </div>
          </section>

          <section className="selected-plan-card" aria-live="polite">
            <div className="selected-plan-top">
              <div><p className="section-kicker">DAY {String(selected.dayIndex).padStart(2, "0")}</p><h2>{selected.date} · 星期{selected.weekday}</h2></div>
              <span className={selected.kind === "training" ? "plan-kind training" : "plan-kind recovery"}>{selected.kind === "training" ? "训练日" : "恢复日"}</span>
            </div>
            <h3>{selected.title}</h3>
            <p className="selected-plan-detail">{selected.detail} · 约 {selected.kcal} kcal</p>
            {selected.kind === "training" ? (
              <div className="plan-exercise-preview">
                {selectedExerciseSets.map(([name, detail], index) => <div className="plan-exercise-row" key={name}><span>{String(index + 1).padStart(2, "0")}</span><strong>{name}</strong><small>{detail}</small></div>)}
              </div>
            ) : (
              <div className="recovery-note"><span>☼</span><p>今天让身体恢复一下：轻松散步 30 分钟，睡前做 8 分钟拉伸。</p></div>
            )}
            {/* Native anchors keep navigation working in the Sites/vinext runtime. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="selected-plan-link" href="/">回到今天，开始执行 <span>→</span></a>
          </section>
        </div>

        <MiniNav active="plan" />
      </section>
    </main>
  );
}
