"use client";

import { useMemo, useState } from "react";
import { HandIcon } from "../components/illustrations";
import { MiniNav } from "../components/mini-nav";
import "./plan.css";

type PlanDay = {
  dayIndex: number;
  date: string;
  dayNumber: string;
  weekday: string;
  title: string;
  kind: "training" | "recovery";
  detail: string;
  kcal: number;
};

const weekdayLabels = ["日", "一", "二", "三", "四", "五", "六"];

const planDays: PlanDay[] = Array.from({ length: 30 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 7, 4 + index));
  const weekday = weekdayLabels[date.getUTCDay()];
  const training = index % 7 === 0 || index % 7 === 2 || index % 7 === 4;
  const title = training
    ? ["全身激活日", "下肢力量日", "上肢力量日"][Math.floor(index / 7) % 3]
    : "恢复与轻活动";
  return {
    dayIndex: index + 1,
    date: `${date.getUTCMonth() + 1}月${date.getUTCDate()}日`,
    dayNumber: String(date.getUTCDate()),
    weekday,
    title,
    kind: training ? "training" : "recovery",
    detail: training ? "训练 + 拉伸" : "散步 + 放松",
    kcal: training ? 1700 : 1550,
  };
});

const selectedExerciseSets = [
  ["高脚杯深蹲", "4 × 12"],
  ["单臂哑铃划船", "4 × 10"],
  ["臀桥", "3 × 15"],
] as const;

export default function PlanPage() {
  const [selectedIndex, setSelectedIndex] = useState(7);
  const selected = planDays[selectedIndex];
  const weekLabel = useMemo(() => `第 ${Math.floor((selected.dayIndex - 1) / 7) + 1} 周`, [selected.dayIndex]);

  return (
    <main className="site-shell">
      <div className="blob blob-a" />
      <div className="blob blob-b" />
      <section className="phone plan-phone" aria-label="轻练 30 天计划">
        <div className="screen">
          <header className="topbar">
            {/* Native anchors keep navigation working in the Sites/vinext runtime. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="brand" href="/" aria-label="回到轻练今天">
              <span className="mark">轻</span>
              <span className="wordmark">轻练</span>
            </a>
            <span className="topbtn plan-top-label num">30 天计划</span>
          </header>

          <section className="greet plan-greet rise" style={{ paddingBottom: 8 }}>
            <div>
              <div className="eyebrow num">AUGUST · 2026</div>
              <h1>一步一步，把这个月走完。</h1>
              <p>教练已为你安排好未来 30 天。</p>
            </div>
          </section>

          <section className="statrow rise" style={{ animationDelay: ".05s" }} aria-label="计划摘要">
            <div><div className="lb">次 / 周训练</div><div className="vv num">3</div></div>
            <div><div className="lb">个餐次 / 天</div><div className="vv num">4</div></div>
            <div className="stat-confirmed"><span className="chip confirmed">教练已确认</span></div>
          </section>

          <div className="sec-head rise" style={{ animationDelay: ".1s" }}>
            <span className="eyebrow">Calendar</span>
            <h3>选择一天</h3>
            <span className="count">{weekLabel}</span>
          </div>

          <div className="calgrid rise" style={{ animationDelay: ".12s" }} aria-label="30 天计划日历">
            {weekdayLabels.map((day) => <span className="wd" key={day}>{day}</span>)}
            {planDays.map((day, index) => (
              <button
                className={`calcell ${day.kind === "recovery" ? "rest" : ""} ${index === selectedIndex ? "sel" : ""}`}
                type="button"
                key={day.dayIndex}
                onClick={() => setSelectedIndex(index)}
                aria-label={`第 ${day.dayIndex} 天，${day.date}，${day.title}`}
                aria-pressed={index === selectedIndex}
              >
                <span className="dn num">{day.dayNumber}</span>
                <span className="dot" aria-hidden="true" />
              </button>
            ))}
          </div>

          <section className="daypreview rise" style={{ animationDelay: ".16s" }} aria-live="polite">
            <div className="dp-head"><span className="tag num">DAY {String(selected.dayIndex).padStart(2, "0")}</span><span className="chip confirmed">{selected.kind === "training" ? "训练日" : "恢复日"}</span></div>
            <div className="dp-title">{selected.date} · 星期{selected.weekday}</div>
            <div className="dp-meta">{selected.title} · {selected.detail} · 约 <span className="num">{selected.kcal}</span> kcal</div>
            {selected.kind === "training" ? (
              <div className="mini-exercises">
                {selectedExerciseSets.map(([name, detail], index) => <div className="miniex" key={name}><span className="exidx num">{String(index + 1).padStart(2, "0")}</span><span>{name}</span><span className="num">{detail}</span></div>)}
              </div>
            ) : (
              <div className="recovery-note"><HandIcon name="sun" /><p>今天让身体恢复一下：轻松散步 30 分钟，睡前做 8 分钟拉伸。</p></div>
            )}
            {/* Native anchors keep navigation working in the Sites/vinext runtime. */}
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a className="cta" href="/">回到今天，开始执行 <HandIcon name="arrow" /></a>
          </section>

          <MiniNav active="plan" />
        </div>
      </section>
    </main>
  );
}
